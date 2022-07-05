var DIM = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9);
var PT_RAD = 5;
var COORD_RAD = 4;
var xMin = -10, xMax = 10, tMin = -10, tMax = 10;
var xStep = 1, tStep = 1;
var numDec = 4;
var TOL = .000000000004;//Math.pow(2, -35);
var FRAMES = 20;
var FRAME_GAP = 50;

var canv = document.getElementById("myCanvas");
canv.setAttribute("width", DIM);
canv.setAttribute("height", DIM);
var canvRect = canv.getBoundingClientRect();
var ctx = canv.getContext("2d");

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
function animate(oldStates, basis, f)
{
	for(var i = 0; i < oldStates.length; i++)
	{
		states[i] = trans(oldStates[i], [basis[0] * f / FRAMES, basis[1] * f / FRAMES, basis[2] * f / FRAMES]);
	}
	update();
	if(f < FRAMES) setTimeout(function(){animate(oldStates, basis, f + 1);}, FRAME_GAP);
	else
	{
		update();
		//document.getElementById("xedit").value = 0;
		//document.getElementById("tedit").value = 0;
		//document.getElementById("vedit").value = 0;
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
	update();
	basis = [toFloat(document.getElementById("xedit").value),
			toFloat(document.getElementById("tedit").value),
			toFloat(document.getElementById("vedit").value)];
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
	animate(oldStates, basis, 1);
}

//delete a reference frame
function remove()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	else if(confirm("Are you sure to PERMANENTLY delete reference frame "+(idx+1)+"?"))
	{
		states.splice(idx, 1);
		edits.splice(idx, 1);
		ticks.splice(idx, 1);
		if(idx >= states.length)
			update(idx - 1);
		else
			update();
	}
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
		var text = fr.result;
		var keys = text.substr(text.lastIndexOf("@\n") + 2).split(/\s+/).reverse();
		xMin = toFloat(keys.pop()); xMax = toFloat(keys.pop());
		tMin = toFloat(keys.pop()); tMax = toFloat(keys.pop());
		xStep = toFloat(keys.pop()); tStep = toFloat(keys.pop());
		var numFrame = Math.round(toFloat(keys.pop()));
		states = []; edits = []; ticks = [];

		//get reference frame lines
		for(var i = 0; i < numFrame; i++)
		{
			ticks.push(Number.parseInt(keys.pop()) == 1);
			states.push([]);
			states[i].push(toFloat(keys.pop()));
			states[i].push(toFloat(keys.pop()));
			states[i].push(toFloat(keys.pop()));
			edits.push([]);
			edits[i].push(toFloat(keys.pop()));
			edits[i].push(toFloat(keys.pop()));
			edits[i].push(toFloat(keys.pop()));
		}

		//update notes and refresh
		document.getElementById("notes").value = text.substr(0, text.lastIndexOf('@'));
		document.getElementById("import").value = "";
		update(1);
	}
	if(this.files.length > 0)
	{
		fr.readAsText(this.files[0]);
	}

}

function fileSave()
{
	var link = document.getElementById("exportLink");
	var text = document.getElementById("notes").value + "@\n";
	text += xMin + " " + xMax + " " + tMin + " " + tMax + " " + xStep + " " + tStep + "\n";
	text += states.length + "\n";
	for(var i = 0; i < states.length; i++)
		text += (ticks[i] ? 1 : 0) + " " + toFloat(states[i][0]) + " " + toFloat(states[i][1]) + " " +
				toFloat(states[i][2]) + " " + toFloat(edits[i][0]) + " " + toFloat(edits[i][1]) + " " +
				toFloat(edits[i][2]) + "\n";
	var data = new Blob([text], {type: 'text/plain'});
	link.href = window.URL.createObjectURL(data);
	link.click();
	return false;
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

/*
Mouse interaction
*/

/*
pointer interaction to emulate mouse
*/

/*
new interface mechanics (making use of mouse interaction)
*/


/*
lockout/cancellation procedures
*/

