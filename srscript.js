const delay = ms => new Promise(res => setTimeout(res, ms));

var DIM = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9);
var PT_RAD = 5;
var COORD_RAD = 4;
var xMin = -10, xMax = 10, tMin = -10, tMax = 10;
var xStep = 1, tStep = 1;
var numDec = 4;
var TOL = .000000000002;//Math.pow(2, -35);
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
//scale for x-axis
function xScale(coord)
{
	return Math.round(DIM * (coord - xMin) / (xMax - xMin));
}

//undo x scale
function xUnscale(coord)
{
	return coord * 1.0 / DIM * (xMax - xMin) + xMin;
}

//scale for t-axis
function tScale(coord)
{
	return Math.round(DIM * (tMax - coord) / (tMax - tMin));
}

//undo t scale
function tUnscale(coord)
{
	return tMax - coord * 1.0 / DIM * (tMax - tMin);
}

//draw point given coordinates
function drawP(state)
{
	ctx.beginPath();
	ctx.arc(xScale(state[0]), tScale(state[1]), PT_RAD, 0, 2 * Math.PI);
	ctx.stroke();
}

//draw tick mark given location (in pixels) and slope
function drawTick(x, t, slp)
{
	ctx.beginPath();
	ctx.moveTo(x - COORD_RAD / Math.sqrt(1 + slp * slp), t - COORD_RAD * slp / Math.sqrt(1 + slp * slp));
	ctx.lineTo(x + COORD_RAD / Math.sqrt(1 + slp * slp), t + COORD_RAD * slp / Math.sqrt(1 + slp * slp));
	ctx.stroke();
}

//draw x-axis, with optional tick marks
function drawX(state, tick = true)
{
	//axis
	ctx.beginPath();
	ctx.moveTo(xScale(xMin), tScale(state[1] + state[2] * (xMin - state[0])));
	ctx.lineTo(xScale(xMax), tScale(state[1] + state[2] * (xMax - state[0])));
	ctx.stroke();

	//tick marks
	if(tick)
	{
		var step = xStep / Math.sqrt(1 - state[2] * state[2]);
		for(var i = step * Math.ceil((xMin - state[0]) / step) + state[0], j = (xMax - i) / (xMax - xMin);
				i <= xMax; i += step, j = (xMax - i) / (xMax - xMin))
		{
			drawTick(xScale(xMin * j + xMax * (1 - j)),
					tScale(state[1] + state[2] * (xMin * j + xMax * (1 - j) - state[0])),
					(state[2] == 0 ? 1 / TOL : 1 / state[2]));
		}
	}
}

//draw t-axis, with optional tick marks
function drawT(state, tick = true)
{
	//axis
	ctx.beginPath();
	ctx.moveTo(xScale(state[0] + state[2] * (tMin - state[1])), tScale(tMin));
	ctx.lineTo(xScale(state[0] + state[2] * (tMax - state[1])), tScale(tMax));
	ctx.stroke();

	//tick marks
	if(tick)
	{
		var step = tStep / Math.sqrt(1 - state[2] * state[2]);
		for(var i = step * Math.ceil((tMin - state[1]) / step) + state[1], j = (tMax - i) / (tMax - tMin);
				i <= tMax; i += step, j = (tMax - i) / (tMax - tMin))
		{
			drawTick(xScale(state[0] + state[2] * (tMin * j + tMax * (1 - j) - state[1])),
					tScale(tMin * j + tMax * (1 - j)), state[2]);
		}
	}
}

//draw light rays through point (dashed lines)
function drawLight(state)
{
	//top left to bottom right
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.moveTo(xScale(xMin), tScale(state[1] - (xMin - state[0])));
	ctx.lineTo(xScale(xMax), tScale(state[1] - (xMax - state[0])));
	ctx.stroke();

	//bottom left to top right
	ctx.beginPath();
	ctx.moveTo(xScale(xMin), tScale(state[1] + (xMin - state[0])));
	ctx.lineTo(xScale(xMax), tScale(state[1] + (xMax - state[0])));
	ctx.stroke();
	ctx.setLineDash([]);
}

//draw state with desired point, axes, light rays, and tick mark options
function draw(state, p = true, x = true, t = true, lt = false, tick = true)
{
	if(p) drawP(state);
	if(x) drawX(state, tick);
	if(t) drawT(state, tick);
	if(lt) drawLight(state);
}

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
var axes = [true, true];

//redraw the canvas
function redraw()
{
	ctx.clearRect(0, 0, canv.width, canv.height);
	for(var i = 0; i < states.length; i ++)
	{
		draw(states[i], true, true, true, false, axes[i]);
	}
	drawLight([0, 0, 0]);
}

//convert any type to float, rounding off insignificant bits
function toFloat(num)
{
	return TOL * Math.round(Number.parseFloat(num) / TOL);
}

//format number for printing
function numForm(num)
{
	var out = toFloat(num).toFixed(numDec);
	return ((out.startsWith("-") ? "" : " ") + out).substr(0, 3 + numDec);
}

//re-list numbers in the reference frame list
function relist()
{
	var out = "<pre>  #  +  x"+" ".repeat(numDec + 1)+"  t"+" ".repeat(numDec + 1)+"  v/c<br>";
	for(var i = 0; i < states.length; i++)
	{
		out += (Math.abs(states[i][0]) < TOL && Math.abs(states[i][1]) < TOL &&
		    	Math.abs(states[i][2]) < TOL ? "> " : "  ") + (i + 1) + "  " + (axes[i] ? "#" : "-") + " " +
		    	numForm(states[i][0]) + " " + numForm(states[i][1]) + " " + numForm(states[i][2]) + "<br>";
	}
	document.getElementById("states").innerHTML = out + "</pre>";
}

//animate a coordinate transition
function animate(oldStates, basis, f)
{
	for(var i = 0; i < oldStates.length; i++)
	{
		states[i] = trans(oldStates[i], [basis[0] * f / FRAMES, basis[1] * f / FRAMES, basis[2] * f / FRAMES]);
	}
	redraw();
	if(f < FRAMES) setTimeout(function(){animate(oldStates, basis, f + 1);}, FRAME_GAP);
	else
	{
		relist();
		document.getElementById("xedit").value = 0;
		document.getElementById("tedit").value = 0;
		document.getElementById("vedit").value = 0;
	}
}

/*
handle form inputs
*/

//update the bounding coordinates of the canvas window
function updateCoord()
{
	if(toFloat(document.getElementById("xmin").value) < toFloat(document.getElementById("xmax").value) &&
			toFloat(document.getElementById("tmin").value) < toFloat(document.getElementById("tmax").value) &&
			toFloat(document.getElementById("xstep").value) > 0 &&
			toFloat(document.getElementById("tstep").value) > 0)
	{
		xMin = toFloat(document.getElementById("xmin").value);
		xMax = toFloat(document.getElementById("xmax").value);
		tMin = toFloat(document.getElementById("tmin").value);
		tMax = toFloat(document.getElementById("tmax").value);
		xStep = toFloat(document.getElementById("xstep").value);
		tStep = toFloat(document.getElementById("tstep").value);
		redraw();
	}
	else
	{
		alert("Invalid coordinate values");
	}
}

//update precision on coordinate list
function decimals(change)
{
	numDec += change;
	numDec = Math.max(numDec, 1);
	relist();
}

//pull frame info from the form's frame index
function load()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(0 <= idx && idx < states.length && Math.abs(idx - Math.round(idx)) < TOL)
	{
		document.getElementById("xedit").value = toFloat(states[idx][0]);
		document.getElementById("tedit").value = toFloat(states[idx][1]);
		document.getElementById("vedit").value = toFloat(states[idx][2]);
		document.getElementById("ax").checked = axes[idx];
	}
	else
	{
		alert("Invalid reference frame index.");
	}
}

//update frame info at the form's frame index
function save()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	var x = toFloat(document.getElementById("xedit").value);
	var t = toFloat(document.getElementById("tedit").value);
	var v = toFloat(document.getElementById("vedit").value);
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	else if(Math.abs(v) >= 1)
	{
		alert("Superluminal speeds not allowed");
		return;
	}
	else if((Math.abs(states[idx][0] - edits[idx][0]) < TOL && Math.abs(states[idx][1] - edits[idx][1]) < TOL &&
			Math.abs(states[idx][2] - edits[idx][2]) < TOL) || confirm(
			"This will permanently overwrite data you wrote in another reference frame."))
	{
		states[idx][0] = x; edits[idx][0] = x;
		states[idx][1] = t; edits[idx][1] = t;
		states[idx][2] = v; edits[idx][2] = v;
		axes[idx] = document.getElementById("ax").checked;
		redraw();
		relist();
	}
}

//create new reference frame and change the selected index
function saveNew()
{
	if(Math.abs(toFloat(document.getElementById("vedit").value)) >= 1)
	{
		alert("Superluminal speeds not allowed");
		return;
	}
	states.push([toFloat(document.getElementById("xedit").value),
			toFloat(document.getElementById("tedit").value),
			toFloat(document.getElementById("vedit").value)]);
	edits.push([toFloat(document.getElementById("xedit").value),
			toFloat(document.getElementById("tedit").value),
			toFloat(document.getElementById("vedit").value)]);
	axes.push(document.getElementById("ax").checked);
	document.getElementById("ref").value = toFloat(states.length);
	redraw();
	relist();
}

//choose the current editor space as a new reference frame basis and translate everything
function transform()
{
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
		axes.splice(idx, 1);
		redraw();
		relist();
	}
}

//intersect the form frame index x-axis with the rest x-axis
function intersectXX()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	if(Math.abs(states[idx][2]) < TOL)
	{
		alert("Can't intersect parallel lines.");
		return;
	}
	document.getElementById("xedit").value = toFloat(states[idx][0] - states[idx][1] / states[idx][2]);
	document.getElementById("tedit").value = toFloat(0);
	document.getElementById("ax").checked = false;
}

//intersect the form frame index x-axis with the rest t-axis
function intersectXT()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	document.getElementById("xedit").value = toFloat(0);
	document.getElementById("tedit").value = toFloat(states[idx][1] - states[idx][0] * states[idx][2]);
	document.getElementById("ax").checked = false;
}

//intersect the form frame index t-axis with the rest x-axis
function intersectTX()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	document.getElementById("xedit").value = toFloat(states[idx][0] - states[idx][1] * states[idx][2]);
	document.getElementById("tedit").value = toFloat(0);
	document.getElementById("ax").checked = false;
}

//intersect the form frame index t-axis with the rest t-axis
function intersectTT()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	if(Math.abs(states[idx][2]) < TOL)
	{
		alert("Can't intersect parallel lines.");
		return;
	}
	document.getElementById("xedit").value = toFloat(0);
	document.getElementById("tedit").value = toFloat(states[idx][1] - states[idx][0] / states[idx][2]);
	document.getElementById("ax").checked = false;
}

//create a slope from the current editor location to the chosen frame index's location
// (intended for subluminal travel routes; confirmation required for simultaneity alignment)
function pointAt()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
	{
		alert("Invalid reference frame index.");
		return;
	}
	var x = toFloat(document.getElementById("xedit").value);
	var t = toFloat(document.getElementById("tedit").value);
	if(Math.abs(x - states[idx][0]) >= Math.abs(t - states[idx][1]))
	{
		if(confirm("Target point outside of light cone.\nDo you want to point the x-axis instead?"))
		{
			document.getElementById("vedit").value = toFloat((t - states[idx][1]) / (x - states[idx][0]));
		}
	}
	else
	{
		document.getElementById("vedit").value = toFloat((x - states[idx][0]) / (t - states[idx][1]));
	}
}

/*
handle exports/imports
*/

//file opener
document.getElementById("import").addEventListener('change', function()
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
				!confirm("This file is not a recognized \"rf\" file type.\nAre you still sure to continue?")) return;

		//start loading
		var text = fr.result;
		var keys = text.substr(text.lastIndexOf("@\n") + 2).split(/\s+/).reverse();
		xMin = toFloat(keys.pop()); xMax = toFloat(keys.pop());
		tMin = toFloat(keys.pop()); tMax = toFloat(keys.pop());
		xStep = toFloat(keys.pop()); tStep = toFloat(keys.pop());
		var numFrame = Math.round(toFloat(keys.pop()));
		states = []; edits = []; axes = [];

		//get reference frame lines
		for(var i = 0; i < numFrame; i++)
		{
			axes.push(Number.parseInt(keys.pop()) == 1);
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
		relist();
		redraw();
	}
	if(this.files.length > 0) fr.readAsText(this.files[0]);

});

function fileSave()
{
	var link = document.getElementById("exportLink");
	var text = document.getElementById("notes").value + "@\n";
	text += xMin + " " + xMax + " " + tMin + " " + tMax + " " + xStep + " " + tStep + "\n";
	text += states.length + "\n";
	for(var i = 0; i < states.length; i++)
		text += (axes[i] ? 1 : 0) + " " + toFloat(states[i][0]) + " " + toFloat(states[i][1]) + " " +
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

//mouse parameters
var PAN = 1; //left button
var PT_CLOSE = 20;
var ZOOM_FACTOR = 1.03;
var oldMouseX = 0, oldMouseY = 0;
var mouseMode = false;

//distance from a point (two coords) to a line (two coords per defining point)
function ptLineDist(x0, y0, x1, y1, x2, y2)
{
	return Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) / Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}

//highlight closest frame
function showClose(event)
{

	//get closest point
	var x = event.clientX - canvRect.left;
	var y = event.clientY - canvRect.top;
	var dist = DIM * 2, close = -1;
	var r = 0;
	for(var i = 0; i < states.length; i++)
	{
		//alert([i, x, xScale(states[i][0]), y, tScale(states[i][1])]);
		r = Math.sqrt(Math.pow(x - xScale(states[i][0]), 2) + Math.pow(y - tScale(states[i][1]), 2));
		if(xMin < states[i][0] && states[i][0] < xMax && tMin < states[i][1] && states[i][1] < tMax
				&& r < PT_CLOSE && r < dist)
		{
			dist = r;
			close = i;
		}
	}

	//return if no close enough point, else find closest line
	if(close == -1)
	{
		redraw();
		return;
	}
	dist = DIM * 2; closeLn = -1;
	for(var i = 0; i < states.length; i++)
	{
		//ensure defined at relevant point
		if(Math.abs(states[close][0] - states[i][0]) > TOL || Math.abs(states[close][1] - states[i][1]) > TOL)
		{
			continue;
		}

		//try closest x axis
		r = ptLineDist(x, y, xScale(xMin), tScale(states[i][1] + states[i][2] * (xMin - states[i][0])), xScale(xMax),
				tScale(states[i][1] + states[i][2] * (xMax - states[i][0])));
		if(r < dist)
		{
			dist = r;
			closeLn = i;
		}

		//try closest t axis
		r = ptLineDist(x, y, xScale(states[i][0] + states[i][2] * (tMin - states[i][1])), tScale(tMin),
				xScale(states[i][0] + states[i][2] * (tMax - states[i][1])), tScale(tMax));
		if(r < dist)
		{
			dist = r;
			closeLn = i;
		}
	}

	//save old line settings
	var oldLineWidth = ctx.lineWidth;
	var oldStrokeStyle = ctx.strokeStyle

	//redraw and load new line settings
	redraw();
	ctx.lineWidth *= 2;
	ctx.strokeStyle = "#FF0000";

	//highlight (see redraw()) and reset line settings
	draw(states[closeLn], true, true, true, false, axes[closeLn]);
	ctx.lineWidth = oldLineWidth;
	ctx.strokeStyle = oldStrokeStyle;
	return;
}

//pan based on mouse motion
function pan(event)
{
	//get mouse location
	var x = event.clientX - canvRect.left;
	var y = event.clientY - canvRect.top;
	//document.getElementById("debug1").value = x;
	//document.getElementById("debug2").value = y;
	
	//determine coordinate shift
	var dx = xUnscale(x) - xUnscale(oldMouseX);
	var dy = tUnscale(y) - tUnscale(oldMouseY);
	document.getElementById("debug3").value = dx;
	document.getElementById("debug4").value = dy;

	//apply coordinate shift
	document.getElementById("xmin").value = -dx + toFloat(document.getElementById("xmin").value);
	document.getElementById("xmax").value = -dx + toFloat(document.getElementById("xmax").value);
	document.getElementById("tmin").value = -dy + toFloat(document.getElementById("tmin").value);
	document.getElementById("tmax").value = -dy + toFloat(document.getElementById("tmax").value);
	updateCoord();

}

//zoom with given power
function zoom(event, pwr)
{
	//get mouse coordinates ON GRID
	var x = xUnscale(event.clientX - canvRect.left);
	var y = tUnscale(event.clientY - canvRect.top);

	//adjust boundaries accordingly
	document.getElementById("xmin").value = x + Math.pow(ZOOM_FACTOR, pwr) *
			(toFloat(document.getElementById("xmin").value) - x);
	document.getElementById("xmax").value = x + Math.pow(ZOOM_FACTOR, pwr) *
			(toFloat(document.getElementById("xmax").value) - x);
	document.getElementById("tmin").value = y + Math.pow(ZOOM_FACTOR, pwr) *
			(toFloat(document.getElementById("tmin").value) - y);
	document.getElementById("tmax").value = y + Math.pow(ZOOM_FACTOR, pwr) *
			(toFloat(document.getElementById("tmax").value) - y);
	updateCoord();
}

//on mouse move: highlight closest element, drag if mouse down
canv.addEventListener("mousemove", function(event)
{
	mouseMode = true;

	//get mouse location
	var x = event.clientX - canvRect.left;
	var y = event.clientY - canvRect.top;

	//highlights
	showClose(event);

	//drag panning
	if(event.buttons & PAN > 0)
		pan(event);
		
	//update most recent location
	oldMouseX = x;
	oldMouseY = y;
}, false);

//on mouse scroll: zoom on mouse center
canv.addEventListener("wheel", function(event)
{
	mouseMode = true;

	//if scroll up (-) zoom in, else zoom out
	zoom(event, event.deltaY < 0 ? -1 : 1);

	//don't actually scroll
	event.preventDefault();
	return false;
}, false);

/*
pointer interaction to emulate mouse
*/
var pointCache = new Array();
var prevPtrGap = 0;

//register new pointer
canv.addEventListener("pointerdown", function(event)
{
	//prevent mouse confusion
	if(mouseMode) return;
	event.preventDefault();

	pointCache.push(event);

	//update center of pointers
	oldMouseX = 0;
	oldMouseY = 0;
	for(var i = 0; i < pointCache.length; i++)
	{
		oldMouseX += pointCache[i].clientX;
		oldMouseY += pointCache[i].clientY;
	}
	oldMouseX /= pointCache.length;
	oldMouseY /= pointCache.length;

	//update highlights and finish saving coordinates
	showClose({clientX: oldMouseX, clientY: oldMouseY});
	oldMouseX -= canvRect.left;
	oldMouseY -= canvRect.top;
}, false);

//update moving pointer
canv.addEventListener("pointermove", function(event)
{
	//prevent mouse confusion
	if(mouseMode) return;
	if(pointCache.length == 0) return;
	event.preventDefault();

	//keep track of motion in cache
	for(var i = 0; i < pointCache.length; i++)
	{
		if(pointCache[i].pointerId == event.pointerId)
		{
			pointCache[i] = event;
			break;
		}
	}

	//given two pointers, create zoomable wheel event
	if(pointCache.length == 2)
	{
		var ptrGap = Math.sqrt(Math.pow(pointCache[0].clientX - pointCache[1].clientX, 2) +
				Math.pow(pointCache[0].clientY - pointCache[1].clientY, 2));
		zoom({clientX: (pointCache[0].clientX + pointCache[1].clientX) / 2,
				clientY: (pointCache[0].clientY + pointCache[1].clientY) / 2},
				(ptrGap > prevPtrGap ? -1 : 1));
		prevPtrGap = ptrGap;
	}

	//create pannable mouse move event
	var ptrX = 0, ptrY = 0;
	for(var i = 0; i < pointCache.length; i++)
	{
		ptrX += pointCache[i].clientX;
		ptrY += pointCache[i].clientY;
	}
	ptrX /= pointCache.length;
	ptrY /= pointCache.length;
	pan({clientX: ptrX, clientY: ptrY});

	//update highlights and finish saving coordinates
	showClose({clientX: ptrX, clientY: ptrY});
	oldMouseX = ptrX - canvRect.left;
	oldMouseY = ptrY - canvRect.top;

}, false);

//unregister removed pointers
canv.addEventListener("pointerup", function(event)
{
	//prevent mouse confusion
	if(mouseMode) return;
	event.preventDefault();

	//remove from cache
	for(var i = 0; i < pointCache.length; i++)
	{
		if(pointCache[i].pointerId == event.pointerId)
		{
			pointCache.splice(i, 1);
			break;
		}
	}

	//reset pointer gap ALWAYS
	prevPtrGap = 0;

	//update center of pointers
	oldMouseX = 0;
	oldMouseY = 0;
	for(var i = 0; i < pointCache.length; i++)
	{
		oldMouseX += pointCache[i].clientX;
		oldMouseY += pointCache[i].clientY;
	}
	oldMouseX /= pointCache.length;
	oldMouseY /= pointCache.length;

	//update highlights and finish saving coordinates
	if(pointCache.length > 0) showClose({clientX: oldMouseX, clientY: oldMouseY});
	oldMouseX -= canvRect.left;
	oldMouseY -= canvRect.top;
}, false);

/*
load js elements
*/

redraw();
relist();
load();
