//@@toFloat needed in file retrieval?

//defining constants
var DIM = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9);
var PT_RAD = 5;
var COORD_RAD = 4;
var xMin = -10, xMax = 10, tMin = -10, tMax = 10;
var xStep = 1, tStep = 1;
var numDec = 4;
var TOL = .000000000004;
var FRAMES = 20;
var FRAME_GAP = 50;

//canvas setup
var canv = document.getElementById("myCanvas");
canv.setAttribute("width", DIM);
canv.setAttribute("height", DIM);
var canvRect = canv.getBoundingClientRect();
var ctx = canv.getContext("2d");

//finish text editor formatting
document.getElementById("notes").style.height = window.innerHeight * 0.4 + "px";

//generate HTML in cell (coordinates, velocitites, and form)
var cell;
if(window.innerWidth > 1.75 * window.innerHeight)
	cell = document.getElementById("wide");
else
	cell = document.getElementById("tall");
cell.innerHTML = document.getElementById("temp").innerHTML;
document.getElementById("temp").innerHTML = "";

/*
handle coordinate transforms and drawing
*/

//translate a reference frame into its coordinates in a new basis frame
function trans(vect, basis)
{
	var out = [0, 0, 0];
	out[2] = (vect[2] - basis[2]) / (1 - vect[2] * basis[2]);
	out[0] = ((vect[0] - basis[0]) - (vect[1] - basis[1]) * basis[2]) / Math.sqrt(1 - basis[2] * basis[2]);
	out[1] = ((vect[1] - basis[1]) - (vect[0] - basis[0]) * basis[2]) / Math.sqrt(1 - basis[2] * basis[2]);
	return out;
}

/*
handle refreshing and coordinate swapping from the top-level
*/

var states = [[0, 0, 0], [5, 0, -0.6]];
var edits = [[0, 0, 0], [5, 0, -0.6]];
var ticks = [true, true];
var keepFrames = -1;
var special = [];
var specialCap = 0;

//animate a coordinate transition
function animate(oldStates, basis, oldBBox, f)
{
	memTimeout = (new Date()).getTime();
	for(var i = 0; i < oldStates.length; i++)
	{
		states[i] = trans(oldStates[i],
				[basis[0] * f / FRAMES, basis[1] * f / FRAMES, basis[2] * f / FRAMES]);
	}
	xMin = //document.getElementById("xmin").value =
			parseFloat(oldBBox[0] - (oldBBox[0] + oldBBox[1]) / 2 * Math.pow(f / FRAMES, 2));
	xMax = //document.getElementById("xmax").value =
			parseFloat(oldBBox[1] - (oldBBox[0] + oldBBox[1]) / 2 * Math.pow(f / FRAMES, 2));
	tMin = //document.getElementById("tmin").value =
			parseFloat(oldBBox[2] - (oldBBox[2] + oldBBox[3]) / 2 * Math.pow(f / FRAMES, 2));
	tMax = //document.getElementById("tmax").value =
			parseFloat(oldBBox[3] - (oldBBox[2] + oldBBox[3]) / 2 * Math.pow(f / FRAMES, 2));
	update();
	if(f < FRAMES) setTimeout(function(){animate(oldStates, basis, oldBBox, f + 1);}, FRAME_GAP);
	else
	{
		update();
	}
}

/*
handle form inputs
*/

//update precision on coordinate list
function decimals(change)
{
	numDec += change;
	numDec = Math.min(Math.max(numDec, 1), 12);
	update();
}

//choose the current editor space as a new reference frame basis and translate everything
function transform()
{
	memTimeout = (new Date()).getTime();
	update();
	load();
	basis = [getEdit("x"), getEdit("t"), getEdit("v")];
	if(Math.abs(basis[2]) >= 1)
	{
		alert("Superluminal speeds not allowed");
		return;
	}
	oldStates = [];
	for(var i = 0; i < states.length; i++)
	{
		oldStates.push(states[i]);
	}
	animate(oldStates, basis, [xMin, xMax, tMin, tMax], 1);
}

/*
handle exports/imports
*/

//face for file opener
document.getElementById("btnImport").addEventListener("click", function()
{
	document.getElementById("import").click();
}, false);

//file opener
document.getElementById("import").addEventListener('change', importchangeFn, false);
function importchangeFn()
{
	var fr=new FileReader();
	fr.onload=function()
	{
		//get confirmations
		if(!confirm("Importing a file will overwrite all existing reference frames and notes.\n" +
				"Are you sure to continue?")) return;
		var load = document.getElementById("import");
		var ext = load.value.substring(load.value.lastIndexOf('.') + 1);
		if(!(ext.startsWith("rf") && ext.length == 2) &&
				!confirm("This file is not a recognized \"rf\" file type.\nAre you still sure to continue?"))
			return;

		//start loading
		fromText(fr.result);
	}
	if(this.files.length > 0)
	{
		fr.readAsText(this.files[0]);
	}

}

//export as file
function fileSave()
{
	var link = document.getElementById("exportLink");
	var data = new Blob([toText()], {type: 'text/plain'});
	link.href = window.URL.createObjectURL(data);
	link.click();
	return false;
}

/*
handle undo / redo behaviors
*/

//undo/redo space
var mem = [];
var memCap = 0;
var memTimeout = 0;
var MEM_GAP = 400;

//automatic state-saving
setInterval(function()
{
	text = toText();
	if(specialCap == 0 && ((new Date()).getTime() - memTimeout > MEM_GAP) &&
			(mem.length == 0 || text !== mem[memCap - 1]))
	{
		mem.splice(memCap);
		mem.push(text);
		memCap++;
	}
}, 200);

//how to undo
document.getElementById("btnUndo").addEventListener("click", undo, false);
function undo()
{
	//memTimeout = (new Date()).getTime();
	if(specialCap == 0 && memCap > 1)// && toText() === mem[memCap - 1])
	{
		//mem.pop();
		memCap--;
		fromText(mem[memCap - 1]);
	}
	/*else if(memCap > 0)
	{
		fromText(mem[memCap - 1]);
	}*/
}

//how to redo
document.getElementById("btnRedo").addEventListener("click", redo, false);
function redo()
{
	if(specialCap == 0 && memCap < mem.length)
	{
		memCap++;
		fromText(mem[memCap - 1]);
	}
}

//process undo / redo / cancel / save / import key input
document.body.addEventListener('keydown', function(e)
{
	//update document history
	if(e.key.toLowerCase() == "z" && e.ctrlKey && !e.shiftKey)
	{
		e.preventDefault();
		if(!document.getElementById("btnUndo").disabled)
			undo();
	}
	else if(e.key.toLowerCase() == "y" && e.ctrlKey && !e.shiftKey
			|| e.key.toLowerCase() == "z" && e.ctrlKey && e.shiftKey)
	{
		e.preventDefault();
		if(!document.getElementById("btnRedo").disabled)
			redo();
	}

	//call cancel
	else if(e.key.toLowerCase() == "escape")
	{
		e.preventDefault();
		cancel();
	}

	//save file
	else if(e.ctrlKey && e.key.toLowerCase() == "s")
	{
		e.preventDefault();
		fileSave();
	}

	//import file
	else if(e.ctrlKey && e.key.toLowerCase() == "o")
	{
		e.preventDefault();
		document.getElementById("import").click();
	}
}, false);

/*
convert program info to text
*/

function toText()
{
	var text = document.getElementById("notes").value + "@\n";
	text += xMin + " " + xMax + " " + tMin + " " + tMax + "\n";
	text += xFactor + " " + tFactor + "\n";
	text += states.length + " " + document.getElementById("ref").value + "\n";
	for(var i = 0; i < states.length; i++)
		text += (ticks[i] ? 1 : 0) + " " + parseFloat(states[i][0]) + " " + parseFloat(states[i][1]) + " " +
				parseFloat(states[i][2]) + " " + parseFloat(edits[i][0]) + " " + parseFloat(edits[i][1]) + " " +
				parseFloat(edits[i][2]) + "\n";
	return text;
}

function fromText(text)
{
	var keys = text.substr(text.lastIndexOf("@\n") + 2).split(/\s+/).reverse();
	xMin /*document.getElementById("xmin").value*/ = parseFloat(keys.pop());
	xMax /*document.getElementById("xmax").value*/ = parseFloat(keys.pop());
	tMin /*document.getElementById("tmin").value*/ = parseFloat(keys.pop());
	tMax /*document.getElementById("tmax").value*/ = parseFloat(keys.pop());
	approxUnits(1 / parseFloat(keys.pop()), 1 / parseFloat(keys.pop()));
	update();
	var numFrame = Math.round(parseFloat(keys.pop()));
	var refNum = parseInt(keys.pop());
	states = []; edits = []; ticks = [];

	//get reference frame lines
	for(var i = 0; i < numFrame; i++)
	{
		ticks.push(Number.parseInt(keys.pop()) == 1);
		states.push([]);
		states[i].push(parseFloat(keys.pop()));
		states[i].push(parseFloat(keys.pop()));
		states[i].push(parseFloat(keys.pop()));
		edits.push([]);
		edits[i].push(parseFloat(keys.pop()));
		edits[i].push(parseFloat(keys.pop()));
		edits[i].push(parseFloat(keys.pop()));
	}

	//update notes and refresh
	document.getElementById("notes").value = text.substr(0, text.lastIndexOf('@'));
	document.getElementById("import").value = "";
	update(refNum);
	cancel();
}

/*
The calculator that should be harder to find...
*/

function calcV()
{
	document.getElementById("d1").value = Math.abs(document.getElementById("d1").value);
	document.getElementById("d2").value = Math.abs(document.getElementById("d2").value);
	var mn = Math.min(document.getElementById("d1").value, document.getElementById("d2").value);
	var mx = Math.max(document.getElementById("d1").value, document.getElementById("d2").value);
	document.getElementById("vcalc").value = Math.sqrt(1 - (mn * mn) / (mx * mx));
}