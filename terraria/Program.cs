using System;
using System.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.InteropServices;
using Microsoft.Xna.Framework;
using ReLogic.IO;
using ReLogic.OS;
using Terraria.Initializers;
using Terraria.Localization;
using Terraria.Social;
using Terraria.Utilities;
using System.Collections.Generic;
using ReLogic.Graphics;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Content;
using Terraria;


[assembly: System.Runtime.Versioning.SupportedOSPlatform("browser")]

public class FNAGame : Game
{

    public FNAGame()
    {
        GraphicsDeviceManager gdm = new GraphicsDeviceManager(this);

        // Typically you would load a config here...
        gdm.PreferredBackBufferWidth = 512;
        gdm.PreferredBackBufferHeight = 512;
        gdm.IsFullScreen = false;
        gdm.SynchronizeWithVerticalRetrace = true;
    }

    byte r = 0;
    byte g = 0;
    byte b = 0;
    DateTime lastUpdate = DateTime.UnixEpoch;
    int updateCount = 0;

    protected override void Initialize()
    {
        /* This is a nice place to start up the engine, after
		 * loading configuration stuff in the constructor
		 */
        base.Initialize();
    }

    protected override void LoadContent()
    {
        // Load textures, sounds, and so on in here...
        base.LoadContent();
    }

    protected override void UnloadContent()
    {
        // Clean up after yourself!
        base.UnloadContent();
    }

    protected override void Update(GameTime gameTime)
    {
        // Run game logic in here. Do NOT render anything here!
        base.Update(gameTime);
        updateCount++;
        DateTime now = DateTime.UtcNow;
        if ((now - lastUpdate).TotalSeconds > 1.0)
        {
            Console.WriteLine($"Main loop still running at: {now}; {Math.Round(updateCount / (now - lastUpdate).TotalSeconds, MidpointRounding.AwayFromZero)} UPS");
            lastUpdate = now;
            updateCount = 0;
        }
        if (r != 255)
        {
            r++;
            return;
        }
        if (g != 255)
        {
            g++;
            return;
        }
        if (b != 255)
        {
            b++;
            return;
        }
        r = 0;
        g = 0;
        b = 0;
    }

    protected override void Draw(GameTime gameTime)
    {
        // Render stuff in here. Do NOT run game logic in here!
        GraphicsDevice.Clear(new Color(r, g, b));
        base.Draw(gameTime);
    }
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
        });

        Console.WriteLine("pre ININITNITITIT");
    }

    [JSExport]
    internal static void Init()
    {
        ContentTypeReaderManagerMetaTypeManager.backupType = typeof(ReLogic.Graphics.DynamicSpriteFontReader);
        // Any init for the Game - usually before game.Run() in the decompilation

        // TrySettingFNAToOpenGL(args);

        // Terraria.LaunchParameters = Terraria.Utils.ParseArguements(args);
        SavePath = "libsdl/tsaves";
        ThreadPool.SetMinThreads(1, 1);
        ThreadPool.SetMaxThreads(1, 1);
        // InitializeConsoleOutput();
        // SetupLogging();


		LanguageManager.Instance.SetLanguage(GameCulture.DefaultCulture);
        try
        {
            Terraria.Main main = new Terraria.Main();
            Terraria.Lang.InitializeLegacyLocalization();
            SocialAPI.Initialize();
            LaunchInitializer.LoadParameters(main);
            game = main;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }
        // Main.OnEnginePreload += StartForceLoad;


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
