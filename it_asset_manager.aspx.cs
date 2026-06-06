using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;
using System.Web.UI;

public partial class it_asset_manager : Page
{
    private string connectionString = @"Server=SARAVANAN-IT\SQLEXPRESS;Database=IT_Asset_Manager;User Id=sa;Password=Welcome@123;TrustServerCertificate=True;";

    private class MailAlert
    {
        public string Subject { get; set; }
        public string Body { get; set; }
    }

    protected void Page_Load(object sender, EventArgs e)
    {
        // 1. Core database initialization check
        try
        {
            InitializeDb();
        }
        catch (Exception ex)
        {
            WriteErrorResponse("Database setup error: " + ex.Message);
            return;
        }

        // 2. Route AJAX requests by action parameter
        string action = Request.QueryString["action"];
        if (string.IsNullOrEmpty(action))
        {
            // If no action is specified, let IIS render the ASPX HTML contents
            return;
        }

        Response.Clear();
        Response.ContentType = "application/json";
        Response.Headers.Add("Access-Control-Allow-Origin", "*");

        try
        {
            switch (action.ToLower())
            {
                case "load":
                    HandleLoad();
                    break;
                case "save":
                    if (Request.HttpMethod == "POST")
                    {
                        HandleSave();
                    }
                    else
                    {
                        WriteErrorResponse("Invalid HTTP method for save. Use POST.");
                    }
                    break;
                case "history":
                    HandleHistory();
                    break;
                default:
                    WriteErrorResponse("Unknown action: " + action);
                    break;
            }
        }
        catch (Exception ex)
        {
            WriteErrorResponse(ex.Message);
        }
        finally
        {
            Response.End();
        }
    }

    private void HandleLoad()
    {
        var serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = int.MaxValue;

        var result = new Dictionary<string, object>();

        using (var conn = new SqlConnection(connectionString))
        {
            conn.Open();

            // Load assets
            var assets = QueryAllRows(conn, "SELECT * FROM assets");
            result["assets"] = assets;

            // Load companies
            var companies = QueryAllRows(conn, "SELECT * FROM companies");
            result["companies"] = companies;

            // Load users
            var users = QueryAllRows(conn, "SELECT * FROM users");
            foreach (var u in users)
            {
                u["active"] = GetInt(u, "active", 0) == 1;
            }
            result["users"] = users;

            // Load permissions
            var permsResult = QueryAllRows(conn, "SELECT * FROM perms");
            var perms = new Dictionary<string, Dictionary<string, bool>>();
            foreach (var p in permsResult)
            {
                string role = GetStr(p, "role");
                perms[role] = new Dictionary<string, bool>
                {
                    { "view", GetInt(p, "view") == 1 },
                    { "create", GetInt(p, "create") == 1 },
                    { "edit", GetInt(p, "edit") == 1 },
                    { "delete", GetInt(p, "delete") == 1 },
                    { "users", GetInt(p, "users") == 1 },
                    { "reports", GetInt(p, "reports") == 1 },
                    { "settings", GetInt(p, "settings") == 1 },
                    { "transfer", GetInt(p, "transfer") == 1 },
                    { "master", GetInt(p, "master") == 1 },
                    { "ticketOnly", GetInt(p, "ticketOnly") == 1 }
                };
            }
            result["perms"] = perms;

            // Load master configuration
            var masterResult = QueryAllRows(conn, "SELECT * FROM master");
            var master = new Dictionary<string, List<string>>
            {
                { "os", new List<string>() },
                { "office", new List<string>() },
                { "department", new List<string>() },
                { "location", new List<string>() }
            };
            foreach (var m in masterResult)
            {
                string cat = GetStr(m, "category");
                string val = GetStr(m, "value");
                if (master.ContainsKey(cat))
                {
                    master[cat].Add(val);
                }
            }
            result["master"] = master;

            // Load notifications
            var notifications = QueryAllRows(conn, "SELECT * FROM notifications ORDER BY time DESC");
            foreach (var n in notifications)
            {
                string targetsStr = GetStr(n, "targets");
                n["targets"] = string.IsNullOrEmpty(targetsStr) ? new object[0] : serializer.Deserialize<object>(targetsStr);
            }
            result["notifications"] = notifications;

            // Load transfers
            var transfers = QueryAllRows(conn, "SELECT * FROM transfers ORDER BY date DESC");
            result["transfers"] = transfers;

            // Load settings
            var settingsResult = QueryAllRows(conn, "SELECT * FROM settings");
            var settings = new Dictionary<string, string>();
            foreach (var s in settingsResult)
            {
                settings[GetStr(s, "key")] = GetStr(s, "value");
            }
            result["settings"] = settings;

            // Load tickets
            var tickets = QueryAllRows(conn, "SELECT * FROM tickets ORDER BY ticketId DESC");
            result["tickets"] = tickets;
        }

        Response.Write(serializer.Serialize(result));
    }

    private void HandleSave()
    {
        string body;
        using (var reader = new StreamReader(Request.InputStream))
        {
            body = reader.ReadToEnd();
        }

        var serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = int.MaxValue;
        var S = serializer.Deserialize<Dictionary<string, object>>(body);

        var assets = (ArrayList)S["assets"];
        var companies = (ArrayList)S["companies"];
        var users = (ArrayList)S["users"];
        var perms = (Dictionary<string, object>)S["perms"];
        var master = (Dictionary<string, object>)S["master"];
        var notifications = (ArrayList)S["notifications"];
        var transfers = (ArrayList)S["transfers"];
        
        var settingsDict = S.ContainsKey("settings") ? (Dictionary<string, object>)S["settings"] : new Dictionary<string, object>();
        var ticketsList = S.ContainsKey("tickets") ? (ArrayList)S["tickets"] : new ArrayList();
        var emailSettings = S.ContainsKey("emailSettings") ? (Dictionary<string, object>)S["emailSettings"] : new Dictionary<string, object>();

        bool alertOnCreate = emailSettings.ContainsKey("create") && emailSettings["create"] != null && emailSettings["create"].ToString().ToLower() == "true";
        bool alertOnEdit = emailSettings.ContainsKey("edit") && emailSettings["edit"] != null && emailSettings["edit"].ToString().ToLower() == "true";
        bool alertOnTransfer = emailSettings.ContainsKey("transfer") && emailSettings["transfer"] != null && emailSettings["transfer"].ToString().ToLower() == "true";
        bool alertOnDelete = emailSettings.ContainsKey("delete") && emailSettings["delete"] != null && emailSettings["delete"].ToString().ToLower() == "true";

        string changedBy = S.ContainsKey("changedBy") ? S["changedBy"].ToString() : "System";
        string changeDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

        var emailAlertsToTrigger = new List<MailAlert>();

        using (var conn = new SqlConnection(connectionString))
        {
            conn.Open();
            using (var transaction = conn.BeginTransaction())
            {
                try
                {
                    // 1. Fetch current assets from DB for diffing
                    var existingAssets = new Dictionary<string, Dictionary<string, object>>();
                    using (var cmd = new SqlCommand("SELECT * FROM assets", conn, transaction))
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var a = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                a[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                            }
                            existingAssets[GetStr(a, "id")] = a;
                        }
                    }

                    // 2. Fetch company mapping for diff labels
                    var companyMap = new Dictionary<string, string>();
                    foreach (Dictionary<string, object> c in companies)
                    {
                        companyMap[GetStr(c, "id")] = GetStr(c, "name");
                    }

                    var historyRecords = new List<Dictionary<string, string>>();

                    // 3. Diff incoming assets for creations and updates
                    var fieldsToCompare = new[] {
                        new { Key = "companyId", Label = "Company" },
                        new { Key = "userName", Label = "Assigned User" },
                        new { Key = "location", Label = "Location" },
                        new { Key = "department", Label = "Department" },
                        new { Key = "status", Label = "Status" },
                        new { Key = "ipAddress", Label = "IP Address" },
                        new { Key = "ram", Label = "RAM" },
                        new { Key = "storage", Label = "Storage" },
                        new { Key = "osModel", Label = "OS" },
                        new { Key = "usbAccess", Label = "USB Access" },
                        new { Key = "remarks", Label = "Remarks" },
                        new { Key = "hostname", Label = "Hostname" },
                        new { Key = "make", Label = "Make" },
                        new { Key = "model", Label = "Model" }
                    };

                    var incomingIds = new HashSet<string>();
                    foreach (Dictionary<string, object> a in assets)
                    {
                        string id = GetStr(a, "id");
                        string assetId = GetStr(a, "assetId");
                        string type = GetStr(a, "type");
                        incomingIds.Add(id);

                        if (!existingAssets.ContainsKey(id))
                        {
                            string assignedUser = GetStr(a, "userName");
                            if (string.IsNullOrEmpty(assignedUser)) assignedUser = "unassigned";

                            string detailsText = "Created new asset (" + type + ") assigned to " + assignedUser;
                            historyRecords.Add(new Dictionary<string, string> {
                                { "assetId", assetId },
                                { "action", "create" },
                                { "changedBy", changedBy },
                                { "changeDate", changeDate },
                                { "details", detailsText }
                            });

                            if (alertOnCreate)
                            {
                                emailAlertsToTrigger.Add(new MailAlert
                                {
                                    Subject = "[IT Asset Alert - Created] - " + assetId,
                                    Body = "A new IT asset has been created.<br><br>" +
                                           "<b>Asset ID:</b> " + assetId + "<br>" +
                                           "<b>Type:</b> " + type + "<br>" +
                                           "<b>Make/Model:</b> " + GetStr(a, "make") + " " + GetStr(a, "model") + "<br>" +
                                           "<b>Assigned User:</b> " + assignedUser + "<br>" +
                                           "<b>Location:</b> " + GetStr(a, "location") + "<br>" +
                                           "<b>Department:</b> " + GetStr(a, "department") + "<br>" +
                                           "<b>IP Address:</b> " + GetStr(a, "ipAddress") + "<br><br>" +
                                           "<b>Created By:</b> " + changedBy + "<br>" +
                                           "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                });
                            }
                        }
                        else
                        {
                            var dbAsset = existingAssets[id];
                            var diffs = new List<string>();
                            bool hasCompanyChange = false;
                            bool hasOtherChange = false;

                            foreach (var f in fieldsToCompare)
                            {
                                string valNew = GetStr(a, f.Key);
                                string valOld = GetStr(dbAsset, f.Key);

                                if (f.Key == "companyId")
                                {
                                    if (companyMap.ContainsKey(valNew)) valNew = companyMap[valNew];
                                    if (companyMap.ContainsKey(valOld)) valOld = companyMap[valOld];

                                    if (valNew.Trim() != valOld.Trim())
                                    {
                                        hasCompanyChange = true;
                                        diffs.Add(f.Label + ": \"" + valOld + "\" -> \"" + valNew + "\"");
                                    }
                                }
                                else
                                {
                                    if (valNew.Trim() != valOld.Trim())
                                    {
                                        hasOtherChange = true;
                                        diffs.Add(f.Label + ": \"" + valOld + "\" -> \"" + valNew + "\"");
                                    }
                                }
                            }

                            if (diffs.Count > 0)
                            {
                                string detailsText = string.Join("; ", diffs);
                                historyRecords.Add(new Dictionary<string, string> {
                                    { "assetId", assetId },
                                    { "action", "update" },
                                    { "changedBy", changedBy },
                                    { "changeDate", changeDate },
                                    { "details", detailsText }
                                });

                                if (hasCompanyChange && alertOnTransfer)
                                {
                                    emailAlertsToTrigger.Add(new MailAlert
                                    {
                                        Subject = "[IT Asset Alert - Transferred] - " + assetId,
                                        Body = "An IT asset has been transferred.<br><br>" +
                                               "<b>Asset ID:</b> " + assetId + "<br>" +
                                               "<b>Type:</b> " + type + "<br>" +
                                               "<b>Make/Model:</b> " + GetStr(a, "make") + " " + GetStr(a, "model") + "<br>" +
                                               "<b>Assigned User:</b> " + GetStr(a, "userName") + "<br><br>" +
                                               "<b>Transfer Details:</b> " + detailsText + "<br><br>" +
                                               "<b>Transferred By:</b> " + changedBy + "<br>" +
                                               "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                    });
                                }

                                if (hasOtherChange && alertOnEdit)
                                {
                                    emailAlertsToTrigger.Add(new MailAlert
                                    {
                                        Subject = "[IT Asset Alert - Modified] - " + assetId,
                                        Body = "IT asset details have been modified.<br><br>" +
                                               "<b>Asset ID:</b> " + assetId + "<br>" +
                                               "<b>Type:</b> " + type + "<br>" +
                                               "<b>Make/Model:</b> " + GetStr(a, "make") + " " + GetStr(a, "model") + "<br><br>" +
                                               "<b>Changes Made:</b> " + detailsText + "<br><br>" +
                                               "<b>Modified By:</b> " + changedBy + "<br>" +
                                               "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                    });
                                }
                            }
                        }
                    }

                    // 4. Diff for deleted assets
                    foreach (var kvp in existingAssets)
                    {
                        if (!incomingIds.Contains(kvp.Key))
                        {
                            var dbAsset = kvp.Value;
                            string assetId = GetStr(dbAsset, "assetId");
                            string type = GetStr(dbAsset, "type");
                            string assignedUser = GetStr(dbAsset, "userName");
                            if (string.IsNullOrEmpty(assignedUser)) assignedUser = "unassigned";

                            string detailsText = "Deleted asset (" + type + ") formerly assigned to " + assignedUser;
                            historyRecords.Add(new Dictionary<string, string> {
                                { "assetId", assetId },
                                { "action", "delete" },
                                { "changedBy", changedBy },
                                { "changeDate", changeDate },
                                { "details", detailsText }
                            });

                            if (alertOnDelete)
                            {
                                emailAlertsToTrigger.Add(new MailAlert
                                {
                                    Subject = "[IT Asset Alert - Deleted] - " + assetId,
                                    Body = "An IT asset has been deleted.<br><br>" +
                                           "<b>Asset ID:</b> " + assetId + "<br>" +
                                           "<b>Type:</b> " + type + "<br>" +
                                           "<b>Make/Model:</b> " + GetStr(dbAsset, "make") + " " + GetStr(dbAsset, "model") + "<br>" +
                                           "<b>Formerly Assigned User:</b> " + assignedUser + "<br><br>" +
                                           "<b>Deleted By:</b> " + changedBy + "<br>" +
                                           "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                });
                            }
                        }
                    }

                    // 5. Write history records
                    foreach (var h in historyRecords)
                    {
                        using (var cmd = new SqlCommand("INSERT INTO asset_history (assetId, action, changedBy, changeDate, details) VALUES (@assetId, @action, @changedBy, @changeDate, @details)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@assetId", h["assetId"]);
                            cmd.Parameters.AddWithValue("@action", h["action"]);
                            cmd.Parameters.AddWithValue("@changedBy", h["changedBy"]);
                            cmd.Parameters.AddWithValue("@changeDate", h["changeDate"]);
                            cmd.Parameters.AddWithValue("@details", h["details"]);
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 6. Delete and Re-insert assets
                    using (var cmd = new SqlCommand("DELETE FROM assets", conn, transaction))
                    {
                        cmd.ExecuteNonQuery();
                    }
                    foreach (Dictionary<string, object> a in assets)
                    {
                        string insertSql = @"INSERT INTO assets VALUES (
                            @id, @assetId, @type, @companyId, @ipAddress, @installedDate, @status,
                            @make, @model, @serialNumber, @ram, @storage, @display, @graphics,
                            @osModel, @officeModel, @userName, @hostname, @mailId, @department,
                            @location, @usbAccess, @remarks, @createdAt, @updatedAt
                        )";
                        using (var cmd = new SqlCommand(insertSql, conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(a, "id"));
                            cmd.Parameters.AddWithValue("@assetId", GetStr(a, "assetId"));
                            cmd.Parameters.AddWithValue("@type", GetStr(a, "type"));
                            cmd.Parameters.AddWithValue("@companyId", GetStr(a, "companyId"));
                            cmd.Parameters.AddWithValue("@ipAddress", GetStr(a, "ipAddress"));
                            cmd.Parameters.AddWithValue("@installedDate", GetStr(a, "installedDate"));
                            cmd.Parameters.AddWithValue("@status", GetStr(a, "status", "live"));
                            cmd.Parameters.AddWithValue("@make", GetStr(a, "make"));
                            cmd.Parameters.AddWithValue("@model", GetStr(a, "model"));
                            cmd.Parameters.AddWithValue("@serialNumber", GetStr(a, "serialNumber"));
                            cmd.Parameters.AddWithValue("@ram", GetStr(a, "ram"));
                            cmd.Parameters.AddWithValue("@storage", GetStr(a, "storage"));
                            cmd.Parameters.AddWithValue("@display", GetStr(a, "display"));
                            cmd.Parameters.AddWithValue("@graphics", GetStr(a, "graphics"));
                            cmd.Parameters.AddWithValue("@osModel", GetStr(a, "osModel"));
                            cmd.Parameters.AddWithValue("@officeModel", GetStr(a, "officeModel"));
                            cmd.Parameters.AddWithValue("@userName", GetStr(a, "userName"));
                            cmd.Parameters.AddWithValue("@hostname", GetStr(a, "hostname"));
                            cmd.Parameters.AddWithValue("@mailId", GetStr(a, "mailId"));
                            cmd.Parameters.AddWithValue("@department", GetStr(a, "department"));
                            cmd.Parameters.AddWithValue("@location", GetStr(a, "location"));
                            cmd.Parameters.AddWithValue("@usbAccess", GetStr(a, "usbAccess", "enabled"));
                            cmd.Parameters.AddWithValue("@remarks", GetStr(a, "remarks"));
                            cmd.Parameters.AddWithValue("@createdAt", GetStr(a, "createdAt"));
                            cmd.Parameters.AddWithValue("@updatedAt", GetStr(a, "updatedAt"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 7. Delete and Re-insert companies
                    using (var cmd = new SqlCommand("DELETE FROM companies", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (Dictionary<string, object> c in companies)
                    {
                        using (var cmd = new SqlCommand("INSERT INTO companies VALUES (@id, @name, @code, @address, @phone, @email, @createdAt)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(c, "id"));
                            cmd.Parameters.AddWithValue("@name", GetStr(c, "name"));
                            cmd.Parameters.AddWithValue("@code", GetStr(c, "code"));
                            cmd.Parameters.AddWithValue("@address", GetStr(c, "address"));
                            cmd.Parameters.AddWithValue("@phone", GetStr(c, "phone"));
                            cmd.Parameters.AddWithValue("@email", GetStr(c, "email"));
                            cmd.Parameters.AddWithValue("@createdAt", GetStr(c, "createdAt"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 8. Delete and Re-insert users
                    using (var cmd = new SqlCommand("DELETE FROM users", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (Dictionary<string, object> u in users)
                    {
                        using (var cmd = new SqlCommand("INSERT INTO users VALUES (@id, @username, @password, @name, @role, @dept, @email, @companyId, @active)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(u, "id"));
                            cmd.Parameters.AddWithValue("@username", GetStr(u, "username"));
                            cmd.Parameters.AddWithValue("@password", GetStr(u, "password"));
                            cmd.Parameters.AddWithValue("@name", GetStr(u, "name"));
                            cmd.Parameters.AddWithValue("@role", GetStr(u, "role"));
                            cmd.Parameters.AddWithValue("@dept", GetStr(u, "dept"));
                            cmd.Parameters.AddWithValue("@email", GetStr(u, "email"));
                            cmd.Parameters.AddWithValue("@companyId", GetStr(u, "companyId"));
                            cmd.Parameters.AddWithValue("@active", GetInt(u, "active"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 9. Delete and Re-insert permissions
                    using (var cmd = new SqlCommand("DELETE FROM perms", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (var role in perms.Keys)
                    {
                        var p = (Dictionary<string, object>)perms[role];
                        using (var cmd = new SqlCommand("INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES (@role, @view, @create, @edit, @delete, @users, @reports, @settings, @transfer, @master, @ticketOnly)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@role", role);
                            cmd.Parameters.AddWithValue("@view", GetInt(p, "view"));
                            cmd.Parameters.AddWithValue("@create", GetInt(p, "create"));
                            cmd.Parameters.AddWithValue("@edit", GetInt(p, "edit"));
                            cmd.Parameters.AddWithValue("@delete", GetInt(p, "delete"));
                            cmd.Parameters.AddWithValue("@users", GetInt(p, "users"));
                            cmd.Parameters.AddWithValue("@reports", GetInt(p, "reports"));
                            cmd.Parameters.AddWithValue("@settings", GetInt(p, "settings"));
                            cmd.Parameters.AddWithValue("@transfer", GetInt(p, "transfer"));
                            cmd.Parameters.AddWithValue("@master", GetInt(p, "master"));
                            cmd.Parameters.AddWithValue("@ticketOnly", GetInt(p, "ticketOnly"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 10. Delete and Re-insert master
                    using (var cmd = new SqlCommand("DELETE FROM master", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (var cat in master.Keys)
                    {
                        var vals = (ArrayList)master[cat];
                        foreach (var val in vals)
                        {
                            using (var cmd = new SqlCommand("INSERT INTO master VALUES (@category, @value)", conn, transaction))
                            {
                                cmd.Parameters.AddWithValue("@category", cat);
                                cmd.Parameters.AddWithValue("@value", val.ToString());
                                cmd.ExecuteNonQuery();
                            }
                        }
                    }

                    // 11. Delete and Re-insert notifications
                    using (var cmd = new SqlCommand("DELETE FROM notifications", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (Dictionary<string, object> n in notifications)
                    {
                        var targetsList = n["targets"];
                        string targetsStr = serializer.Serialize(targetsList);

                        using (var cmd = new SqlCommand("INSERT INTO notifications VALUES (@id, @action, @assetId, @assetType, @userName, @companyId, @message, @time, @targets)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(n, "id"));
                            cmd.Parameters.AddWithValue("@action", GetStr(n, "action"));
                            cmd.Parameters.AddWithValue("@assetId", GetStr(n, "assetId"));
                            cmd.Parameters.AddWithValue("@assetType", GetStr(n, "assetType"));
                            cmd.Parameters.AddWithValue("@userName", GetStr(n, "userName"));
                            cmd.Parameters.AddWithValue("@companyId", GetStr(n, "companyId"));
                            cmd.Parameters.AddWithValue("@message", GetStr(n, "message"));
                            cmd.Parameters.AddWithValue("@time", GetStr(n, "time"));
                            cmd.Parameters.AddWithValue("@targets", targetsStr);
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 12. Delete and Re-insert transfers
                    using (var cmd = new SqlCommand("DELETE FROM transfers", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (Dictionary<string, object> t in transfers)
                    {
                        using (var cmd = new SqlCommand("INSERT INTO transfers VALUES (@id, @assetId, @assetType, @fromCompanyId, @toCompanyId, @byUser, @notes, @date)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(t, "id"));
                            cmd.Parameters.AddWithValue("@assetId", GetStr(t, "assetId"));
                            cmd.Parameters.AddWithValue("@assetType", GetStr(t, "assetType"));
                            cmd.Parameters.AddWithValue("@fromCompanyId", GetStr(t, "fromCompanyId"));
                            cmd.Parameters.AddWithValue("@toCompanyId", GetStr(t, "toCompanyId"));
                            cmd.Parameters.AddWithValue("@byUser", GetStr(t, "byUser"));
                            cmd.Parameters.AddWithValue("@notes", GetStr(t, "notes"));
                            cmd.Parameters.AddWithValue("@date", GetStr(t, "date"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 13. Delete and Re-insert settings
                    using (var cmd = new SqlCommand("DELETE FROM settings", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (var key in settingsDict.Keys)
                    {
                        using (var cmd = new SqlCommand("INSERT INTO settings VALUES (@key, @value)", conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@key", key);
                            cmd.Parameters.AddWithValue("@value", settingsDict[key] != null ? settingsDict[key].ToString() : "");
                            cmd.ExecuteNonQuery();
                        }
                    }

                    // 14. Diff tickets and insert
                    var existingTickets = new Dictionary<string, Dictionary<string, object>>();
                    using (var cmd = new SqlCommand("SELECT * FROM tickets", conn, transaction))
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var tk = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                tk[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                            }
                            existingTickets[GetStr(tk, "id")] = tk;
                        }
                    }

                    foreach (Dictionary<string, object> t in ticketsList)
                    {
                        string id = GetStr(t, "id");
                        string tkId = GetStr(t, "ticketId");
                        string subject = GetStr(t, "subject");
                        string description = GetStr(t, "description");
                        string status = GetStr(t, "status", "open");
                        string createdBy = GetStr(t, "createdBy");
                        string response = GetStr(t, "response");
                        string respondedBy = GetStr(t, "respondedBy");

                        if (!existingTickets.ContainsKey(id))
                        {
                            // NEW TICKET
                            emailAlertsToTrigger.Add(new MailAlert
                            {
                                Subject = "[IT Service Ticket Created] - " + tkId,
                                Body = "A new IT service ticket has been created.<br><br>" +
                                       "<b>Ticket ID:</b> " + tkId + "<br>" +
                                       "<b>Subject:</b> " + subject + "<br>" +
                                       "<b>Description:</b> " + description + "<br>" +
                                       "<b>Created By:</b> " + createdBy + "<br>" +
                                       "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                            });
                        }
                        else
                        {
                            var oldTk = existingTickets[id];
                            string oldStatus = GetStr(oldTk, "status");
                            int oldEscalated = GetInt(oldTk, "escalated");
                            int newEscalated = GetInt(t, "escalated");
                            string callAttendFor = GetStr(t, "callAttendFor");
                            string escalationDetails = GetStr(t, "escalationDetails");

                            if (oldEscalated == 0 && newEscalated == 1)
                            {
                                // TICKET ESCALATED
                                emailAlertsToTrigger.Add(new MailAlert
                                {
                                    Subject = "[IT Support Ticket ESCALATED] - " + tkId,
                                    Body = "An IT Support support ticket has been escalated to management.<br><br>" +
                                           "<b>Ticket ID:</b> " + tkId + "<br>" +
                                           "<b>Subject:</b> " + subject + "<br>" +
                                           "<b>Created By:</b> " + createdBy + "<br>" +
                                           "<b>Attended Details (Call Attend For):</b> " + (string.IsNullOrEmpty(callAttendFor) ? "None" : callAttendFor) + "<br>" +
                                           "<b>Escalation Details:</b> " + (string.IsNullOrEmpty(escalationDetails) ? "No details provided" : escalationDetails) + "<br>" +
                                           "<b>Escalated By:</b> " + (string.IsNullOrEmpty(respondedBy) ? "IT Admin" : respondedBy) + "<br>" +
                                           "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                });
                            }

                            if (oldStatus == "open" && status == "responded")
                            {
                                // TICKET RESPONDED
                                emailAlertsToTrigger.Add(new MailAlert
                                {
                                    Subject = "[IT Service Ticket Responded] - " + tkId,
                                    Body = "Your IT service ticket has been responded to.<br><br>" +
                                           "<b>Ticket ID:</b> " + tkId + "<br>" +
                                           "<b>Subject:</b> " + subject + "<br>" +
                                           "<b>Response:</b> " + response + "<br>" +
                                           "<b>Responded By:</b> " + respondedBy + "<br>" +
                                           "<b>Date:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                });
                            }
                            else if (oldStatus != "closed" && status == "closed")
                            {
                                // TICKET CLOSED
                                emailAlertsToTrigger.Add(new MailAlert
                                {
                                    Subject = "[IT Service Ticket Closed] - " + tkId,
                                    Body = "Your IT service ticket has been closed.<br><br>" +
                                           "<b>Ticket ID:</b> " + tkId + "<br>" +
                                           "<b>Subject:</b> " + subject + "<br>" +
                                           "<b>Resolution Details:</b> " + (string.IsNullOrEmpty(response) ? "Resolved" : response) + "<br>" +
                                           "<b>Closed At:</b> " + DateTime.Now.ToString("dd-MMM-yyyy HH:mm")
                                });
                            }
                        }
                    }

                    using (var cmd = new SqlCommand("DELETE FROM tickets", conn, transaction)) { cmd.ExecuteNonQuery(); }
                    foreach (Dictionary<string, object> t in ticketsList)
                    {
                        string insertSql = @"INSERT INTO tickets (
                            id, ticketId, subject, description, companyId, status,
                            createdBy, createdAt, response, respondedBy, respondedAt, closedAt,
                            attachmentName, attachmentData, ipAddress, mobileExt, callAttendFor, escalated, escalationDetails
                        ) VALUES (
                            @id, @ticketId, @subject, @description, @companyId, @status,
                            @createdBy, @createdAt, @response, @respondedBy, @respondedAt, @closedAt,
                            @attachmentName, @attachmentData, @ipAddress, @mobileExt, @callAttendFor, @escalated, @escalationDetails
                        )";
                        using (var cmd = new SqlCommand(insertSql, conn, transaction))
                        {
                            cmd.Parameters.AddWithValue("@id", GetStr(t, "id"));
                            cmd.Parameters.AddWithValue("@ticketId", GetStr(t, "ticketId"));
                            cmd.Parameters.AddWithValue("@subject", GetStr(t, "subject"));
                            cmd.Parameters.AddWithValue("@description", GetStr(t, "description"));
                            cmd.Parameters.AddWithValue("@companyId", GetStr(t, "companyId"));
                            cmd.Parameters.AddWithValue("@status", GetStr(t, "status"));
                            cmd.Parameters.AddWithValue("@createdBy", GetStr(t, "createdBy"));
                            cmd.Parameters.AddWithValue("@createdAt", GetStr(t, "createdAt"));
                            cmd.Parameters.AddWithValue("@response", GetStr(t, "response"));
                            cmd.Parameters.AddWithValue("@respondedBy", GetStr(t, "respondedBy"));
                            cmd.Parameters.AddWithValue("@respondedAt", GetStr(t, "respondedAt"));
                            cmd.Parameters.AddWithValue("@closedAt", GetStr(t, "closedAt"));
                            cmd.Parameters.AddWithValue("@attachmentName", GetStr(t, "attachmentName"));
                            cmd.Parameters.AddWithValue("@attachmentData", GetStr(t, "attachmentData"));
                            cmd.Parameters.AddWithValue("@ipAddress", GetStr(t, "ipAddress"));
                            cmd.Parameters.AddWithValue("@mobileExt", GetStr(t, "mobileExt"));
                            cmd.Parameters.AddWithValue("@callAttendFor", GetStr(t, "callAttendFor"));
                            cmd.Parameters.AddWithValue("@escalated", GetInt(t, "escalated"));
                            cmd.Parameters.AddWithValue("@escalationDetails", GetStr(t, "escalationDetails"));
                            cmd.ExecuteNonQuery();
                        }
                    }

                    transaction.Commit();
                    Response.Write("{\"success\":true}");
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    WriteErrorResponse("Transaction failed: " + ex.Message);
                    return;
                }
            }
        }

        // 15. Send Emails Async/After commit so database isn't blocked by network timeouts
        string smtpHost = GetStr(settingsDict, "smtpHost");
        string smtpPortStr = GetStr(settingsDict, "smtpPort");
        string smtpUser = GetStr(settingsDict, "smtpUser");
        string smtpPass = GetStr(settingsDict, "smtpPass");
        string triggeredFrom = GetStr(settingsDict, "triggeredFrom");
        string triggeredTo = GetStr(settingsDict, "triggeredTo");

        int smtpPort = 587;
        int.TryParse(smtpPortStr, out smtpPort);

        // Gather all active root, admin, and manager email addresses
        var recipientEmails = new List<string>();
        foreach (Dictionary<string, object> u in users)
        {
            string role = GetStr(u, "role");
            string email = GetStr(u, "email");
            
            bool isActive = false;
            if (u.ContainsKey("active"))
            {
                if (u["active"] is bool)
                {
                    isActive = (bool)u["active"];
                }
                else
                {
                    int actVal = 0;
                    if (int.TryParse(u["active"].ToString(), out actVal))
                    {
                        isActive = actVal == 1;
                    }
                }
            }

            if (isActive && (role == "root" || role == "admin" || role == "manager"))
            {
                if (!string.IsNullOrEmpty(email) && !recipientEmails.Contains(email))
                {
                    recipientEmails.Add(email);
                }
            }
        }

        if (!string.IsNullOrEmpty(triggeredTo) && !recipientEmails.Contains(triggeredTo))
        {
            recipientEmails.Add(triggeredTo);
        }

        string allRecipients = string.Join(",", recipientEmails);
        if (string.IsNullOrEmpty(allRecipients))
        {
            allRecipients = triggeredTo;
        }

        foreach (var mail in emailAlertsToTrigger)
        {
            SendSmtpEmail(smtpHost, smtpPort, smtpUser, smtpPass, triggeredFrom, allRecipients, mail.Subject, mail.Body);
        }
    }

    private void HandleHistory()
    {
        var serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = int.MaxValue;

        string assetId = Request.QueryString["assetId"];
        using (var conn = new SqlConnection(connectionString))
        {
            conn.Open();
            List<Dictionary<string, object>> history;

            if (string.IsNullOrEmpty(assetId))
            {
                history = QueryAllRows(conn, "SELECT * FROM asset_history ORDER BY changeDate DESC");
            }
            else
            {
                using (var cmd = new SqlCommand("SELECT * FROM asset_history WHERE assetId = @assetId ORDER BY changeDate DESC", conn))
                {
                    cmd.Parameters.AddWithValue("@assetId", assetId);
                    history = new List<Dictionary<string, object>>();
                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var r = new Dictionary<string, object>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                r[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                            }
                            history.Add(r);
                        }
                    }
                }
            }

            Response.Write(serializer.Serialize(history));
        }
    }

    private void InitializeDb()
    {
        using (var conn = new SqlConnection(connectionString))
        {
            conn.Open();

            // Create companies table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('companies', 'U') IS NULL
                CREATE TABLE companies (
                  id NVARCHAR(50) PRIMARY KEY,
                  name NVARCHAR(255),
                  code NVARCHAR(50),
                  address NVARCHAR(MAX),
                  phone NVARCHAR(50),
                  email NVARCHAR(255),
                  createdAt NVARCHAR(100)
                );");

            // Create users table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('users', 'U') IS NULL
                CREATE TABLE users (
                  id NVARCHAR(50) PRIMARY KEY,
                  username NVARCHAR(100) UNIQUE,
                  password NVARCHAR(255),
                  name NVARCHAR(255),
                  role NVARCHAR(50),
                  dept NVARCHAR(100),
                  email NVARCHAR(255),
                  companyId NVARCHAR(50),
                  active INT
                );");

            // Create perms table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('perms', 'U') IS NULL
                CREATE TABLE perms (
                  role NVARCHAR(50) PRIMARY KEY,
                  [view] INT,
                  [create] INT,
                  [edit] INT,
                  [delete] INT,
                  [users] INT,
                  [reports] INT,
                  [settings] INT,
                  [transfer] INT,
                  [master] INT,
                  ticketOnly INT DEFAULT 0
                );");

            // Migration for perms column ticketOnly
            ExecuteDdl(conn, @"
                IF OBJECT_ID('perms', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('perms') AND name = 'ticketOnly'
                )
                ALTER TABLE perms ADD ticketOnly INT DEFAULT 0;");

            // Create master table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('master', 'U') IS NULL
                CREATE TABLE master (
                  category NVARCHAR(100),
                  value NVARCHAR(255),
                  PRIMARY KEY (category, value)
                );");

            // Create assets table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('assets', 'U') IS NULL
                CREATE TABLE assets (
                  id NVARCHAR(50) PRIMARY KEY,
                  assetId NVARCHAR(100),
                  type NVARCHAR(50),
                  companyId NVARCHAR(50),
                  ipAddress NVARCHAR(100),
                  installedDate NVARCHAR(100),
                  status NVARCHAR(50),
                  make NVARCHAR(100),
                  model NVARCHAR(100),
                  serialNumber NVARCHAR(100),
                  ram NVARCHAR(100),
                  storage NVARCHAR(100),
                  display NVARCHAR(100),
                  graphics NVARCHAR(100),
                  osModel NVARCHAR(100),
                  officeModel NVARCHAR(100),
                  userName NVARCHAR(255),
                  hostname NVARCHAR(100),
                  mailId NVARCHAR(255),
                  department NVARCHAR(100),
                  location NVARCHAR(100),
                  usbAccess NVARCHAR(50),
                  remarks NVARCHAR(MAX),
                  createdAt NVARCHAR(100),
                  updatedAt NVARCHAR(100)
                );");

            // Create notifications table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('notifications', 'U') IS NULL
                CREATE TABLE notifications (
                  id NVARCHAR(50) PRIMARY KEY,
                  action NVARCHAR(50),
                  assetId NVARCHAR(100),
                  assetType NVARCHAR(50),
                  userName NVARCHAR(255),
                  companyId NVARCHAR(50),
                  message NVARCHAR(MAX),
                  time NVARCHAR(100),
                  targets NVARCHAR(MAX)
                );");

            // Create transfers table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('transfers', 'U') IS NULL
                CREATE TABLE transfers (
                  id NVARCHAR(50) PRIMARY KEY,
                  assetId NVARCHAR(100),
                  assetType NVARCHAR(50),
                  fromCompanyId NVARCHAR(50),
                  toCompanyId NVARCHAR(50),
                  byUser NVARCHAR(255),
                  notes NVARCHAR(MAX),
                  date NVARCHAR(100)
                );");

            // Create asset_history table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('asset_history', 'U') IS NULL
                CREATE TABLE asset_history (
                  id INT IDENTITY(1,1) PRIMARY KEY,
                  assetId NVARCHAR(100),
                  action NVARCHAR(50),
                  changedBy NVARCHAR(255),
                  changeDate NVARCHAR(100),
                  details NVARCHAR(MAX)
                );");

            // Create settings table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('settings', 'U') IS NULL
                CREATE TABLE settings (
                  [key] NVARCHAR(100) PRIMARY KEY,
                  [value] NVARCHAR(MAX)
                );");

            // Create tickets table
            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NULL
                CREATE TABLE tickets (
                  id NVARCHAR(50) PRIMARY KEY,
                  ticketId NVARCHAR(100),
                  subject NVARCHAR(255),
                  description NVARCHAR(MAX),
                  companyId NVARCHAR(50),
                  status NVARCHAR(50),
                  createdBy NVARCHAR(255),
                  createdAt NVARCHAR(100),
                  response NVARCHAR(MAX),
                  respondedBy NVARCHAR(255),
                  respondedAt NVARCHAR(100),
                  closedAt NVARCHAR(100),
                  attachmentName NVARCHAR(255),
                  attachmentData NVARCHAR(MAX),
                  ipAddress NVARCHAR(100),
                  mobileExt NVARCHAR(100),
                  callAttendFor NVARCHAR(MAX),
                  escalated INT DEFAULT 0,
                  escalationDetails NVARCHAR(MAX)
                );");

            // Migration for tickets table columns
            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'ipAddress'
                )
                ALTER TABLE tickets ADD ipAddress NVARCHAR(100);");

            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'mobileExt'
                )
                ALTER TABLE tickets ADD mobileExt NVARCHAR(100);");

            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'callAttendFor'
                )
                ALTER TABLE tickets ADD callAttendFor NVARCHAR(MAX);");

            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'escalated'
                )
                ALTER TABLE tickets ADD escalated INT DEFAULT 0;");

            ExecuteDdl(conn, @"
                IF OBJECT_ID('tickets', 'U') IS NOT NULL AND NOT EXISTS (
                    SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tickets') AND name = 'escalationDetails'
                )
                ALTER TABLE tickets ADD escalationDetails NVARCHAR(MAX);");

            // Seed default configuration if empty
            using (var cmd = new SqlCommand("SELECT COUNT(*) FROM users", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                if (count == 0)
                {
                    SeedDefaultData(conn);
                }
            }

            // Ensure ticketuser and ticket_only role exist
            using (var cmd = new SqlCommand("SELECT COUNT(*) FROM users WHERE username = 'ticketuser'", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                if (count == 0)
                {
                    ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u6', 'ticketuser', 'ticket123', 'Ticket Only User', 'ticket_only', 'Support', 'ticketuser@acme.com', 'c1', 1)");
                }
            }

            using (var cmd = new SqlCommand("SELECT COUNT(*) FROM perms WHERE role = 'ticket_only'", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                if (count == 0)
                {
                    ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('ticket_only', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)");
                }
            }

            using (var cmd = new SqlCommand("SELECT COUNT(*) FROM perms WHERE role = 'service'", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                if (count == 0)
                {
                    ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('service', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)");
                }
            }

            using (var cmd = new SqlCommand("SELECT COUNT(*) FROM perms WHERE role = 'end_user'", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                if (count == 0)
                {
                    ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('end_user', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)");
                }
            }
        }
    }

    private void SeedDefaultData(SqlConnection conn)
    {
        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

        // 1. Seed companies
        ExecuteNonQuery(conn, "INSERT INTO companies VALUES ('c1', 'Acme Corp', 'ACME', '123 MG Road, Chennai', '044-12345678', 'it@acme.com', '" + now + "')");
        ExecuteNonQuery(conn, "INSERT INTO companies VALUES ('c2', 'TechStar Ltd', 'TSL', '45 Anna Salai, Coimbatore', '0422-9876543', 'it@techstar.com', '" + now + "')");

        // 2. Seed users
        ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u1', 'root', 'root123', 'System Root', 'root', 'IT', 'root@acme.com', 'c1', 1)");
        ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u2', 'admin', 'admin123', 'Admin User', 'admin', 'IT', 'admin@acme.com', 'c1', 1)");
        ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u3', 'manager', 'mgr123', 'IT Manager', 'manager', 'IT', 'manager@acme.com', 'c1', 1)");
        ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u4', 'viewer', 'view123', 'Viewer User', 'viewer', 'HR', 'viewer@acme.com', 'c1', 1)");
        ExecuteNonQuery(conn, "INSERT INTO users VALUES ('u5', 'tsadmin', 'tsl123', 'TSL Admin', 'admin', 'IT', 'admin@techstar.com', 'c2', 1)");

        // 3. Seed perms
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('root', 1, 1, 1, 1, 1, 1, 1, 1, 1, 0)");
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('admin', 1, 1, 1, 1, 0, 1, 0, 1, 1, 0)");
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('manager', 1, 1, 1, 0, 0, 1, 0, 1, 0, 0)");
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('viewer', 1, 0, 0, 0, 0, 1, 0, 0, 0, 0)");
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('service', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)");
        ExecuteNonQuery(conn, "INSERT INTO perms (role, [view], [create], [edit], [delete], [users], [reports], [settings], [transfer], [master], ticketOnly) VALUES ('end_user', 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)");

        // 4. Seed master configuration
        var osList = new[] { "Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home", "Ubuntu 22.04 LTS", "Ubuntu 20.04 LTS", "macOS Sonoma", "macOS Ventura", "CentOS 8", "RHEL 9", "Windows Server 2022", "Windows Server 2019", "pfSense 2.7", "FortiOS 7.4", "Cisco IOS 17.x" };
        foreach (var o in osList) ExecuteNonQuery(conn, "INSERT INTO master VALUES ('os', '" + o + "')");

        var officeList = new[] { "Microsoft 365 Business", "Microsoft Office 2021", "Microsoft Office 2019", "LibreOffice 7", "Google Workspace", "None" };
        foreach (var o in officeList) ExecuteNonQuery(conn, "INSERT INTO master VALUES ('office', '" + o + "')");

        var deptList = new[] { "IT", "HR", "Finance", "Operations", "Marketing", "Sales", "Admin", "Management", "Legal", "R&D" };
        foreach (var d in deptList) ExecuteNonQuery(conn, "INSERT INTO master VALUES ('department', '" + d + "')");

        var locList = new[] { "HQ - Floor 1", "HQ - Floor 2", "HQ - Floor 3", "Branch - North", "Branch - South", "Data Center", "Remote", "Warehouse" };
        foreach (var l in locList) ExecuteNonQuery(conn, "INSERT INTO master VALUES ('location', '" + l + "')");
    }

    private void SendSmtpEmail(string host, int port, string user, string pass, string from, string to, string subject, string body)
    {
        if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to))
        {
            return;
        }

        try
        {
            using (var client = new System.Net.Mail.SmtpClient(host, port))
            {
                client.Credentials = new System.Net.NetworkCredential(user, pass);
                client.EnableSsl = (port == 465 || port == 587 || port == 25);
                
                var mail = new System.Net.Mail.MailMessage();
                mail.From = new System.Net.Mail.MailAddress(from);
                
                string[] addresses = to.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var address in addresses)
                {
                    mail.To.Add(address.Trim());
                }

                mail.Subject = subject;
                mail.Body = body;
                mail.IsBodyHtml = true;

                client.Send(mail);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine("SMTP Send Failed: " + ex.Message);
        }
    }

    // =========================================================================
    //  DB HELPERS
    // =========================================================================
    private void ExecuteDdl(SqlConnection conn, string query)
    {
        using (var cmd = new SqlCommand(query, conn))
        {
            cmd.ExecuteNonQuery();
        }
    }

    private void ExecuteNonQuery(SqlConnection conn, string query)
    {
        using (var cmd = new SqlCommand(query, conn))
        {
            cmd.ExecuteNonQuery();
        }
    }

    private List<Dictionary<string, object>> QueryAllRows(SqlConnection conn, string sqlStr)
    {
        var list = new List<Dictionary<string, object>>();
        using (var cmd = new SqlCommand(sqlStr, conn))
        using (var reader = cmd.ExecuteReader())
        {
            while (reader.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? "" : reader.GetValue(i);
                }
                list.Add(row);
            }
        }
        return list;
    }

    private void WriteErrorResponse(string msg)
    {
        Response.Clear();
        Response.ContentType = "application/json";
        Response.StatusCode = 500;
        Response.Write("{\"error\":\"" + msg.Replace("\"", "\\\"").Replace("\n", " ").Replace("\r", "") + "\"}");
    }

    private string GetStr(Dictionary<string, object> dict, string key, string def = "")
    {
        if (dict.ContainsKey(key) && dict[key] != null)
        {
            return dict[key].ToString();
        }
        return def;
    }

    private int GetInt(Dictionary<string, object> dict, string key, int def = 0)
    {
        if (dict.ContainsKey(key) && dict[key] != null)
        {
            var val = dict[key];
            if (val is bool)
            {
                return (bool)val ? 1 : 0;
            }
            int res;
            if (int.TryParse(val.ToString(), out res))
            {
                return res;
            }
        }
        return def;
    }
}
