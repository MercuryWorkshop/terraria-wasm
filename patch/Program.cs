string input = args[0];
string output = args[1];

var outputStream = new StreamWriter(output);

string? callbackType = null;
int doCallbackId = -1;

using (var reader = new StreamReader(input))
{
    string? line = null;
    while ((line = reader.ReadLine()) != null)
    {
        if (callbackType == null && line.Contains("(type") && line.Contains("(func (param i32 i32 i32) (result i32))"))
        {
            callbackType = line.Split(";")[1];
            Console.Error.WriteLine($"found callback type: {callbackType}");
        }
        if (line.Contains("(elem (;0;)"))
        {
            string[] functable = string.Join("func", line.Split("func").Skip(1)).TrimEnd(')').Split(" ");
            doCallbackId = functable.Index().First(x => x.Item == "$do_callback").Index;
            Console.Error.WriteLine($"found callback index: {doCallbackId}");
        }
    }
}

if (callbackType == null || doCallbackId == -1) throw new Exception(":(");

bool inTarget = false;
int nesting = 0;
using (var reader = new StreamReader(input))
{
    string? line = null;
    while ((line = reader.ReadLine()) != null)
    {
        if (inTarget)
        {
            nesting += line.Count(x => x == '(') - line.Count(x => x == ')');
            Console.Error.WriteLine(line);
        }
        else
            outputStream.WriteLine(line);

        if (nesting < 0)
        {
            inTarget = false;
            nesting = 0;
        }

        if (line.Contains("(func $_emscripten_run_callback_on_thread (type"))
        {
            Console.Error.WriteLine("Found emscripten proxy: {line}");
            outputStream.WriteLine("""
			(local i32 i32)
			call $emscripten_proxy_get_system_queue
			local.set 6
			i32.const 16
			call $dlmalloc
			local.tee 5
			local.get 4
			i32.store offset=12
			local.get 5
			local.get 3
			i32.store offset=8
			local.get 5
			local.get 2
			i32.store offset=4
			local.get 5
			local.get 1
			i32.store
			local.get 6
			local.get 0
			i32.const __X__
			local.get 5
			call $emscripten_proxy_async
			i32.eqz
			if  ;; label = @1
			  i32.const 246281
			  i32.const 164275
			  i32.const 40
			  i32.const 150929
			  call $__assert_fail
			  unreachable
			end)
			""".Replace("__X__", $"{doCallbackId}"));
            inTarget = true;
        }

        if (line.Contains("(func $do_callback (type"))
        {
            Console.Error.WriteLine($"Found emscripten callback: {line}");
            outputStream.WriteLine("""
			local.get 0
			i32.load offset=4
			local.get 0
			i32.load offset=8
			local.get 0
			i32.load offset=12
			local.get 0
			i32.load
			call_indirect (type __X__)
			drop
			local.get 0
			call $dlfree)
			""".Replace("__X__", callbackType));
            inTarget = true;
        }
    }
}

outputStream.Flush();
outputStream.Close();
