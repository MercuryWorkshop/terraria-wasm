using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.InteropServices;
using Terraria.Initializers;
using Terraria.Localization;
using Terraria.Social;
using System.Collections.Generic;
using DepotDownloader;
using SteamKit2;
using QRCoder;
using System.Text.RegularExpressions;
using System.Linq;
using SDL3;

partial class JS
{
    [JSImport("newqr", "depot.js")]
    public static partial void newqr(string dataurl);
}

partial class Program
{
    private static void Main()
    {
        Console.WriteLine("Hi!");
    }

    [DllImport("Emscripten")]
    public extern static int mount_opfs();


    static Terraria.Main game;
    public static bool firstLaunch = true;

    public static bool IsXna = true;
    public static bool IsFna = false;
    public static bool IsMono = true;
    public const bool IsDebug = false;
    public static bool LoadedEverything = true;
    public static Dictionary<string, string> LaunchParameters = new Dictionary<string, string>();
    public static string SavePath;
    public const string TerrariaSaveFolderPath = "libsdl/Terraria";

    [JSExport]
    internal static Task PreInit()
    {
        return Task.Run(() =>
        {
            Console.WriteLine("calling mount_opfs");
            int ret = mount_opfs();
            Console.WriteLine($"called mount_opfs: {ret}");
            if (ret != 0)
            {
                throw new Exception("Failed to mount OPFS");
            }
            Directory.CreateSymbolicLink("/Content", "/libsdl/Content");

            AccountSettingsStore.LoadFromFile("/libsdl/account.config");
            DebugLog.Enabled = false;

            // DebugLog.Enabled = true;
            // DebugLog.AddListener((category, message) =>
            // {
            //     Console.WriteLine("[{0}] {1}", category, message);
            // });


            ContentDownloader.Config.RememberPassword = true;
            // ContentDownloader.Config.UseQrCode = HasParameter(args, "-qr");

            // ContentDownloader.Config.DownloadManifestOnly = HasParameter(args, "-manifest-only");


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
        });
    }

    [JSExport]
    internal static Task Init(int width, int height)
    {
        try
        {
            Microsoft.Xna.Framework.Content.ContentTypeReaderMetaTypeManager.BackupType = typeof(ReLogic.Graphics.DynamicSpriteFontReader);
            SavePath = "libsdl/tsaves";
            game = new Terraria.Main(width, height);

            ThreadPool.SetMinThreads(8, 8);
            LanguageManager.Instance.SetLanguage(GameCulture.DefaultCulture);
            Terraria.Lang.InitializeLegacyLocalization();
            SocialAPI.Initialize(SocialMode.None);
            SocialAPI.Cloud = new Terraria.Social.Custom.CloudSocialModule();
            LaunchInitializer.LoadParameters(game);

            return Task.Delay(0);
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("Error in Init()!!");
            Console.Error.WriteLine(e);
            return Task.FromException(e);
        }
    }

    [JSExport]
    internal static async Task<int> InitSteamSaved()
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
    internal static async Task<bool> DownloadSteamCloud()
    {
        return await ContentDownloader.steam3.DownloadSteamCloud(105600, 100, "/libsdl/remote/");
    }

    [JSExport]
    internal static async Task<int> InitSteam(string username, string password, bool qr)
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
        var depotManifestIds = new List<(uint, ulong)>();
        depotManifestIds.Add((105601, 8046724853517638985));
        // depotManifestIds.Add((731, 7617088375292372759));

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
    internal static Task Cleanup()
    {
        // Any cleanup for the Game - usually after game.Run() in the decompilation
        return Task.Delay(0);
    }

    [JSExport]
    internal static Task<bool> MainLoop()
    {
        try
        {
            game.RunOneFrame();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("Error in MainLoop()!");
            Console.Error.WriteLine(e);
            return Task.FromException<bool>(e);
        }
        return Task.FromResult(game.RunApplication);
    }
}
