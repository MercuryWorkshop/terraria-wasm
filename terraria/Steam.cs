using System;
using DepotDownloader;
using QRCoder;
using System.Text.RegularExpressions;
using System.Linq;
using SteamKit2;
using System.Collections.Generic;
using System.Runtime.InteropServices.JavaScript;
using System.Threading.Tasks;

partial class Steam
{
    internal static void PreInit()
    {
        AccountSettingsStore.LoadFromFile("/libsdl/account.config");
        ContentDownloader.Config.RememberPassword = true;

        ContentDownloader.Config.CellID = 0;

        ContentDownloader.Config.UsingFileList = true;
        ContentDownloader.Config.FilesToDownload = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        ContentDownloader.Config.FilesToDownloadRegex = [
            new Regex("Content\\/.*", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        ];

        ContentDownloader.Config.InstallDirectory = "/libsdl/";

        ContentDownloader.Config.VerifyAll = false;
        ContentDownloader.Config.MaxServers = 20;

        ContentDownloader.Config.MaxDownloads = 8;
        ContentDownloader.Config.MaxServers = 8;
        ContentDownloader.Config.LoginID = null;

        DebugLog.Enabled = false;
    }

    [JSExport]
    internal static async Task<int> Init(string username, string password, bool qr)
    {
        try
        {
            ContentDownloader.Config.UseQrCode = qr;
            Steam3Session.qrCallback = (QRCodeData q) =>
            {
                Console.WriteLine("Got QR code data");
                PngByteQRCode png = new PngByteQRCode(q);
                byte[] bytes = png.GetGraphic(20);
                string dataurl = "data:image/png;base64," + Convert.ToBase64String(bytes);
                JS.newqr(dataurl);
            };

            if (ContentDownloader.InitializeSteam3(username, password))
            {
                return 0;
            }
            else
            {
                Console.WriteLine("Error: InitializeSteam failed");
                return 1;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
        }

        return 1;
    }

    [JSExport]
    internal static async Task<int> DownloadApp()
    {
        List<(uint, ulong)> depotManifestIds = [
			(105601, 8046724853517638985),
			//(731, 7617088375292372759)
		];

        try
        {
            await ContentDownloader.DownloadAppAsync(105600, depotManifestIds, "public", null, null, null, false, false).ConfigureAwait(false);
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine("Could not download app: " + ex.Message);
            return 1;
        }
    }

    [JSExport]
    internal static async Task<int> InitSaved()
    {
        try
        {
            if (AccountSettingsStore.Instance.LoginTokens.Keys.Count > 0)
            {
                string username = AccountSettingsStore.Instance.LoginTokens.Keys.First();
                if (String.IsNullOrEmpty(username)) return 1;

                Console.WriteLine("Using saved login token for " + username);

                if (ContentDownloader.InitializeSteam3(username, null))
                {
                    return 0;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return 1;
        }
        return 1;
    }

    [JSExport]
    internal static async Task<bool> DownloadCloud()
    {
        return await ContentDownloader.steam3.DownloadSteamCloud(105600, 100, "/libsdl/remote/");
    }
}
