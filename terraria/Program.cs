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
using Microsoft.Xna.Framework.Content;

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
    internal static void Init()
    {
        try
        {
            ContentTypeReaderManagerMetaTypeManager.backupType = typeof(ReLogic.Graphics.DynamicSpriteFontReader);
            SavePath = "libsdl/tsaves";
            LanguageManager.Instance.SetLanguage(GameCulture.DefaultCulture);

            Terraria.Main main = new Terraria.Main();

			ThreadPool.SetMinThreads(8, 8);

            Terraria.Lang.InitializeLegacyLocalization();
            SocialAPI.Initialize(null);
            LaunchInitializer.LoadParameters(main);

            game = main;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }
    }

    [JSExport]
    internal static void Cleanup()
    {
        // Any cleanup for the Game - usually after game.Run() in the decompilation
    }

    [JSExport]
    internal static bool MainLoop()
    {
        try
        {
            game.RunOneFrame();
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("Error in MainLoop()!");
            Console.Error.WriteLine(e);
            throw;
        }
        return game.RunApplication;
    }
}
