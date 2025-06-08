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

partial class JS
{
    [JSImport("newqr", "depot.js")]
    public static partial void newqr(string dataurl);
}

partial class Program
{
    private static void TryCreateDirectory(string path)
    {
        if (!Directory.Exists(path))
            Directory.CreateDirectory(path);
    }
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
            TryCreateDirectory("/libsdl/remote/");

			Steam.PreInit();
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
    internal static Task Cleanup()
    {
        // Any cleanup for the Game - usually after game.Run() in the decompilation
        return Task.Delay(0);
    }

    [JSExport]
    internal static Task MainLoop()
    {
        try
        {
            game.Run();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("Error in MainLoop()!");
            Console.Error.WriteLine(e);
            return Task.FromException(e);
        }
        return Task.Delay(0);
    }
}
