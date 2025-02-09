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
        });
    }

    [JSExport]
    internal static Task Init()
    {
        try
        {
            Microsoft.Xna.Framework.Content.ContentTypeReaderMetaTypeManager.BackupType = typeof(ReLogic.Graphics.DynamicSpriteFontReader);
            SavePath = "libsdl/tsaves";
            game = new Terraria.Main();

            ThreadPool.SetMinThreads(8, 8);
            LanguageManager.Instance.SetLanguage(GameCulture.DefaultCulture);
            Terraria.Lang.InitializeLegacyLocalization();
            SocialAPI.Initialize(SocialMode.None);
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
    internal static async Task<int> DownloadDepot(string username, string password, bool qr)
    {
        try
        {


            DebugLog.Enabled = true;

            AccountSettingsStore.LoadFromFile("account.config");
            DebugLog.Enabled = true;
            DebugLog.AddListener((category, message) =>
            {
                Console.WriteLine("[{0}] {1}", category, message);
            });


            ContentDownloader.Config.RememberPassword = true;
            // ContentDownloader.Config.UseQrCode = HasParameter(args, "-qr");

            // ContentDownloader.Config.DownloadManifestOnly = HasParameter(args, "-manifest-only");


            ContentDownloader.Config.CellID = 0;


            // use this later for stuff
            // ContentDownloader.Config.UsingFileList = true;
            // ContentDownloader.Config.FilesToDownload = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            // ContentDownloader.Config.FilesToDownloadRegex = [];

            ContentDownloader.Config.InstallDirectory = "/libsdl/";

            ContentDownloader.Config.VerifyAll = false;
            ContentDownloader.Config.MaxServers = 20;


            ContentDownloader.Config.MaxDownloads = 8;
            ContentDownloader.Config.MaxServers = 8;
            ContentDownloader.Config.LoginID = null;

            ContentDownloader.Config.UseQrCode = qr;


            var depotManifestIds = new List<(uint, ulong)>();
            // depotManifestIds.Add((105601, 8046724853517638985));
            depotManifestIds.Add((731, 7617088375292372759));

            if (ContentDownloader.InitializeSteam3(username, password))
            {
                try
                {
                    //105600
                    await ContentDownloader.DownloadAppAsync(730, depotManifestIds, "public", null, null, null, false, false).ConfigureAwait(false);
                }
                catch (Exception ex) when (
                    ex is ContentDownloaderException
                    || ex is OperationCanceledException)
                {
                    Console.WriteLine(ex.Message);
                    return 1;
                }
                catch (Exception e)
                {
                    Console.WriteLine("Download failed to due to an unhandled exception: {0}", e.Message);
                    throw;
                }
                finally
                {
                    ContentDownloader.ShutdownSteam3();
                }
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


        return 0;
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
