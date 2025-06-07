using System;
using System.Collections.Generic;
using Steamworks;
using Terraria.Social.Base;
using System.IO;

namespace Terraria.Social.Custom;

public class CloudSocialModule : Terraria.Social.Base.CloudSocialModule
{
    private const uint WRITE_CHUNK_SIZE = 1024u;

    private object ioLock = new object();

    private byte[] writeBuffer = new byte[1024];


    string prefix = "/libsdl/remote/";

    public override void Initialize()
    {
    }

    public override void Shutdown()
    {
    }

    public override IEnumerable<string> GetFiles()
    {
        lock (ioLock)
        {
            var files = Directory.EnumerateFiles(prefix, "*", SearchOption.AllDirectories);
            List<string> list = new List<string>();
            foreach (var file in files)
            {
                list.Add(file.Substring(prefix.Length));
            }
            return list;
        }
    }

    public override bool Write(string path, byte[] data, int length)
    {
        lock (ioLock)
        {
            var fs = File.Open(prefix + path, FileMode.Create);
            fs.Write(data, 0, length);
            fs.Close();

            Console.WriteLine("TODO: Implement CloudSocialModule.Write");
            return true;
        }
    }

    public override int GetFileSize(string path)
    {
        lock (ioLock)
        {
            return File.ReadAllBytes(prefix + path).Length;
        }
    }

    public override void Read(string path, byte[] buffer, int size)
    {
        lock (ioLock)
        {
            File.ReadAllBytes(prefix + path).CopyTo(buffer, 0);
        }
    }

    public override bool HasFile(string path)
    {
        lock (ioLock)
        {
            return File.Exists(prefix + path);
        }
    }

    public override bool Delete(string path)
    {
        lock (ioLock)
        {
            Console.WriteLine("TODO: Implement CloudSocialModule.Delete");
            return true;
        }
    }

    public override bool Forget(string path)
    {
        lock (ioLock)
        {
            Console.WriteLine("TODO: Implement CloudSocialModule.Forget");
            return true;
        }
    }
}
