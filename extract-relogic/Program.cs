using System.Reflection;

Assembly assembly = Assembly.LoadFile(Path.GetFullPath(Environment.GetCommandLineArgs()[1]));
(string, string)[] resources = assembly.GetManifestResourceNames()
    .Where(x => x.Contains("Terraria.Libraries"))
    .Select(x =>
    {
        string[] arr = x.Split('.').ToArray();
        var offset = 3;
        if (arr.Length > 4 && (string?)arr.GetValue(3) == "NET" && (string?)arr.GetValue(4) == "Linux")
        {
            offset = 5;
        }
        else if (arr.Length > 3 && ((string?)arr.GetValue(3) == "NET" || (string?)arr.GetValue(3) == "Linux"))
        {
            offset = 4;
        }
        return (x, String.Join('.', arr[offset..(arr.Length)]));
    })
    .ToArray();

foreach (var (id, name) in resources)
{
    Stream? stream = assembly.GetManifestResourceStream(id);
    if (stream == null)
    {
        throw new Exception($"Failed to get {id}");
    }
    FileStream outstream = File.OpenWrite(Environment.GetCommandLineArgs()[2] + "/" + name);
    stream.CopyTo(outstream);
}
