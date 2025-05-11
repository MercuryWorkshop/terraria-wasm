using System.Text.RegularExpressions;

string input = args[0];
string output = args[1];

string content = File.ReadAllText(input);

string type = content.Split("\n").First(x => x.Contains("(type") && x.Contains("(func (param i32 i32 i32) (result i32))")).Split(";")[1];
Console.WriteLine($"found type: {type}");
string[] functable = string.Join("func", content.Split("\n").First(x => x.Contains("(elem (;0;)")).Split("func").Skip(1)).TrimEnd(')').Split(" ");
int id = functable.Index().First(x => x.Item == "$do_callback").Index;
Console.WriteLine($"found index: {id}");

content = Regex.Replace(content, @"\(func \$_emscripten_run_callback_on_thread.*\n([\s\S]*)\)\n\s*\(func \$do_callback", match =>
{
    string fullMatch = match.Value;
    string originalBody = match.Groups[1].Value;

    return fullMatch.Replace(originalBody, """
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
	end
	""".Replace("__X__", $"{id}"));
});

content = Regex.Replace(content, @"\(func \$do_callback.*\n([\s\S]*)\)\n\s*\(func \$_emscripten_set_offscreencanvas_size_on_thread", match =>
{
    string fullMatch = match.Value;
    string originalBody = match.Groups[1].Value;

    return fullMatch.Replace(originalBody, """
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
	call $dlfree
	""".Replace("__X__", type));
});

File.WriteAllText(output, content);
