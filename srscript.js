const delay = ms => new Promise(res => setTimeout(res, ms));

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
//scale for x-axis
function xScale(coord)
{
	return (DIM * (coord - xMin) / (xMax - xMin));
}

//undo x scale
function xUnscale(coord)
{
	return coord * 1.0 / DIM * (xMax - xMin) + xMin;
}

//scale for t-axis
function tScale(coord)
{
	return (DIM * (tMax - coord) / (tMax - tMin));
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
var ticks = [true, true];
var keepFrames = -1;
var special = [];
var specialCap = 0;

//redraw the canvas
function redraw()
{
	ctx.clearRect(0, 0, canv.width, canv.height);
	var oldLineWidth = ctx.lineWidth;
	var oldStrokeStyle = ctx.strokeStyle

	//redraw usual frames
	for(var i = 0; i < states.length; i ++)
	{
		draw(states[i], true, true, true, false, ticks[i]);
	}
	drawLight([0, 0, 0]);

	//load alternate settings for "special" (multiply-selected) frames
	ctx.lineWidth = oldLineWidth * 4;
	ctx.strokeStyle = "#0000FF";
	for(var i = 0; i < special.length; i++)
	{
		draw(states[special[i]], true, true, true, false, ticks[special[i]]);
	}

	//load alternate settings for highlighted frame
	ctx.lineWidth = oldLineWidth * 2;
	ctx.strokeStyle = "#FF0000";
	draw(states[parseInt(document.getElementById("ref").value) - 1], true, true, true, false,
			ticks[parseInt(document.getElementById("ref").value) - 1]);

	//reset draw settings
	ctx.lineWidth = oldLineWidth;
	ctx.strokeStyle = oldStrokeStyle;
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
		    	Math.abs(states[i][2]) < TOL ? "> " : "  ") + (i + 1) + "  " + (ticks[i] ? "#" : "-") + " " +
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
		update();
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
	numDec = Math.min(Math.max(numDec, 1), 12);
	update();
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
		document.getElementById("ax").checked = ticks[idx];
	}
	else
	{
		alert("Invalid reference frame index.");
	}
}

//update frame info at the form's frame index
function save()
{
	btnSave = document.getElementById("btnSave");
	doLockout("btnSave", true);
	if(getComputedStyle(btnSave).borderStyle === "outset")
	{
		document.getElementById("edits").style.display = "inline";
		btnSave.style.borderStyle = "inset";
	}
	else
	{
		//@@pan/zoom resets these values to the selected frame
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
		else if((Math.abs(states[idx][0] - edits[idx][0]) < TOL &&
				Math.abs(states[idx][1] - edits[idx][1]) < TOL &&
				Math.abs(states[idx][2] - edits[idx][2]) < TOL) || confirm(
				"This will permanently overwrite data you wrote in another reference frame."))
		{
			states[idx][0] = x; edits[idx][0] = x;
			states[idx][1] = t; edits[idx][1] = t;
			states[idx][2] = v; edits[idx][2] = v;
			ticks[idx] = document.getElementById("ax").checked;
			update();
		}
		cancel();
		//document.getElementById("edits").style.display = "none";
		//btnSave.style.borderStyle = "outset";
	}
}

//create new reference frame and change the selected index
function saveNew()
{
	btnSaveNew = document.getElementById("btnSaveNew");
	doLockout("btnSaveNew", true);
	if(getComputedStyle(btnSaveNew).borderStyle === "outset")
	{
		document.getElementById("edits").style.display = "inline";
		btnSaveNew.style.borderStyle = "inset";
	}
	else
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
		ticks.push(document.getElementById("ax").checked);
		updateRF(toFloat(states.length));

		cancel();
		//document.getElementById("edits").style.display = "none";
		//btnSaveNew.style.borderStyle = "outset";
	}
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
			updateRF(idx - 1);
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
		updateRF(1);
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

//mouse parameters
var LEFT = 1; //left button
var PT_CLOSE = 60;
var ZOOM_FACTOR = 1.07;
var oldMouseX = 0, oldMouseY = 0;
var mouseMode = 0;
var MOUSE_TIMEOUT = 1000;
var lockout = false;

//distance from a point (two coords) to a line (two coords per defining point)
function ptLineDist(x0, y0, x1, y1, x2, y2)
{
	return Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) /
			Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}

//highlight closest frame
function showClose(event)
{
	//get closest point
	var x = event.pageX - canvRect.left;
	var y = event.pageY - canvRect.top;
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

	//return if no close enough point, else find closest line defined on that point
	if(close == -1)
	{
		update();
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
		r = ptLineDist(x, y, xScale(xMin), tScale(states[i][1] + states[i][2] * (xMin - states[i][0])),
				xScale(xMax), tScale(states[i][1] + states[i][2] * (xMax - states[i][0])));
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

	//set dropdown selection, update "special" frame indices, and redraw
	updateRF(closeLn + 1);
	if(special.length < specialCap) checkSpecial();
	return;
}

//pan based on mouse motion
function pan(event)
{
	//get mouse location
	var x = event.pageX - canvRect.left;
	var y = event.pageY - canvRect.top;
	
	//determine coordinate shift
	var dx = xUnscale(x) - xUnscale(oldMouseX);
	var dy = tUnscale(y) - tUnscale(oldMouseY);

	//apply coordinate shift
	document.getElementById("xmin").value = -dx + toFloat(document.getElementById("xmin").value);
	document.getElementById("xmax").value = -dx + toFloat(document.getElementById("xmax").value);
	document.getElementById("tmin").value = -dy + toFloat(document.getElementById("tmin").value);
	document.getElementById("tmax").value = -dy + toFloat(document.getElementById("tmax").value);
	updateCoord();
	canv.style.cursor = "move";
}

//zoom with given power
function zoom(event, pwr)
{
	//get mouse coordinates ON GRID
	var x = xUnscale(event.pageX - canvRect.left);
	var y = tUnscale(event.pageY - canvRect.top);

	//adjust boundaries accordingly
	document.getElementById("xmin").value = x + Math.pow(ZOOM_FACTOR, pwr) * (xMin - x);
	document.getElementById("xmax").value = x + Math.pow(ZOOM_FACTOR, pwr) * (xMax - x);
	document.getElementById("tmin").value = y + Math.pow(ZOOM_FACTOR, pwr) * (tMin - y);
	document.getElementById("tmax").value = y + Math.pow(ZOOM_FACTOR, pwr) * (tMax - y);
	updateCoord();
	canv.style.cursor = (pwr > 0 ? "zoom-out" : "zoom-in");

	//tweak tickmark scale
	document.getElementById("xstep").value = Math.pow(10, Math.round(Math.log((xMax - xMin) / 2)
			/ Math.log(10)) - 1);
	document.getElementById("tstep").value = toFloat(document.getElementById("xstep").value);
	updateCoord();
}

//on mouse move: highlight closest element, drag if mouse down
canv.addEventListener("mousemove", mousemoveFn, false);
function mousemoveFn(event)
{
	mouseMode = (new Date()).getTime();

	//get mouse location
	var x = event.pageX - canvRect.left;
	var y = event.pageY - canvRect.top;
	canv.style.cursor = "default";

	//highlights
	if(!lockout && event.buttons & LEFT > 0)
		showClose(event);

	//drag panning
	if(event.buttons & LEFT > 0)
		pan(event);

	//update most recent location
	oldMouseX = x;
	oldMouseY = y;
}

//on mouse down: (mouse move behavior)
canv.addEventListener("mousedown", mousedownFn, false);
function mousedownFn(event)
{
	mouseMode = (new Date()).getTime();

	//get mouse location
	var x = event.pageX - canvRect.left;
	var y = event.pageY - canvRect.top;

	//highlights
	if(!lockout)
		showClose(event);

	//update most recent location
	oldMouseX = x;
	oldMouseY = y;
}

//on mouse scroll: zoom on mouse center
canv.addEventListener("wheel", wheelFn, false);
function wheelFn(event)
{
	mouseMode = (new Date()).getTime();

	//if scroll up (-) zoom in, else zoom out
	zoom(event, event.deltaY < 0 ? -1 : 1);

	//don't actually scroll
	event.preventDefault();
	return false;
}

//on mouse up: unlock mouse controls
canv.addEventListener("mouseup", function(event)
{
	canv.style.cursor = "default";
}, false);

/*
pointer interaction to emulate mouse
*/
var pointCache = new Array();
var prevPtrGap = 0;

//register new pointer
canv.addEventListener("pointerdown", pointerdownFn, false);
function pointerdownFn(event)
{
	//prevent mouse confusion
	if((new Date()).getTime() - mouseMode < MOUSE_TIMEOUT) return;
	event.preventDefault();

	pointCache.push(event);

	//update center of pointers
	oldMouseX = 0;
	oldMouseY = 0;
	for(var i = 0; i < pointCache.length; i++)
	{
		oldMouseX += pointCache[i].pageX;
		oldMouseY += pointCache[i].pageY;
	}
	oldMouseX /= pointCache.length;
	oldMouseY /= pointCache.length;

	//update highlights and finish saving coordinates
	if(!lockout)
		showClose({pageX: oldMouseX, pageY: oldMouseY});
	oldMouseX -= canvRect.left;
	oldMouseY -= canvRect.top;
}

//update moving pointer
canv.addEventListener("pointermove", pointermoveFn, false);
function pointermoveFn(event)
{
	//prevent mouse confusion
	if((new Date()).getTime() - mouseMode < MOUSE_TIMEOUT) return;
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
		var ptrGap = Math.sqrt(Math.pow(pointCache[0].pageX - pointCache[1].pageX, 2) +
				Math.pow(pointCache[0].pageY - pointCache[1].pageY, 2));
		if(prevPtrGap == 0) prevPtrGap = ptrGap;
		zoom({pageX: (pointCache[0].pageX + pointCache[1].pageX) / 2,
				pageY: (pointCache[0].pageY + pointCache[1].pageY) / 2},
				Math.log(prevPtrGap / ptrGap) / Math.log(ZOOM_FACTOR));
		prevPtrGap = ptrGap;
	}

	//create pannable mouse move event
	var ptrX = 0, ptrY = 0;
	for(var i = 0; i < pointCache.length; i++)
	{
		ptrX += pointCache[i].pageX;
		ptrY += pointCache[i].pageY;
	}
	ptrX /= pointCache.length;
	ptrY /= pointCache.length;
	pan({pageX: ptrX, pageY: ptrY});

	//update highlights and finish saving coordinates
	if(pointCache.length == 1 && !lockout) showClose({pageX: ptrX, pageY: ptrY});
	oldMouseX = ptrX - canvRect.left;
	oldMouseY = ptrY - canvRect.top;

}

//unregister removed pointers
canv.addEventListener("pointerup", pointerupFn, false);
function pointerupFn(event)
{
	//prevent mouse confusion
	if((new Date()).getTime() - mouseMode < MOUSE_TIMEOUT) return;
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
		oldMouseX += pointCache[i].pageX;
		oldMouseY += pointCache[i].pageY;
	}
	oldMouseX /= pointCache.length;
	oldMouseY /= pointCache.length;

	//update highlights and finish saving coordinates
	if(pointCache.length > 0 && !lockout) showClose({pageX: oldMouseX, pageY: oldMouseY});
	oldMouseX -= canvRect.left;
	oldMouseY -= canvRect.top;
}

/*
new interface mechanics (making use of mouse interaction)
*/

var refUpdate = 0, refUpdateSpecial = 0;
var oldRefVal = 1;

//collect all update functions in a single call
function update()
{
	load();
	redraw();
	relist();
}

//handle reference frame switches
function updateRF(newVal)
{
	document.getElementById("ref").value = newVal;
	update();
	refUpdate += 1;
}

//automatically load on user-driven RF# change
document.getElementById("ref").addEventListener("change", refchangeFn, false);
function refchangeFn()
{
	if(this.value.length < 1) this.value = 1;
	if(this.value.indexOf(".") >= 0) this.value = this.value.split(".")[0];
	if(toFloat(this.value) - states.length > TOL) this.value = states.length;
	if(toFloat(this.value) < 1) this.value = 1;
	
	if(lockout) this.value = oldRefVal + 1;
	else
	{
		oldRefVal = toFloat(this.value);
		update();
		refUpdate += 1;
		checkSpecial();
	}
}

//check the selected frame for special-ness and store if needed
function checkSpecial()
{
	if(refUpdate == refUpdateSpecial) return; //don't update until user finishes entering number
	//(@@ not sure I trust this check against false exits...)
	refUpdateSpecial = refUpdate;
	var val = toFloat(document.getElementById("ref").value) - 1;
	var old = false;
	for(var i = 0; i < special.length; i++)
	{
		if(val == special[i]) old = true;
	}
	if(!old)
	{
		special.push(val);
		update();
	}
}

//function to solve linear equations
function linSolve(x0, y0, m0, x1, y1, m1)
{
	var ma = toFloat(-m0), mb = toFloat(-m1);
	var a = toFloat(y0 - m0 * x0), b = toFloat(y1 - m1 * x1);
	return [toFloat((a - b) / (ma - mb)), toFloat((b * ma - a * mb) / (ma - mb))];
}

//allow selection of new intersect frames
function intersect()
{
	btnIntersect = document.getElementById("btnIntersect");
	doLockout("btnIntersect", false);
	if(getComputedStyle(btnIntersect).borderStyle === "outset")
	{
		specialCap = 2;
		btnIntersect.style.borderStyle = "inset";
	}
	else if(special.length == specialCap && specialCap == 2)
	{
		keepFrames = states.length;
		//try x-x intersect
		newLocs = [];
		if(Math.abs(states[special[0]][2] - states[special[1]][2]) > TOL)
		{
			newLocs.push(linSolve(states[special[0]][0], states[special[0]][1], states[special[0]][2],
					states[special[1]][0], states[special[1]][1], states[special[1]][2]));
		}

		//try x-t intersect
		newLocs.push(linSolve(states[special[0]][0], states[special[0]][1], states[special[0]][2],
				states[special[1]][0], states[special[1]][1],
				(Math.abs(states[special[1]][2]) < TOL ? 1 / TOL / TOL : 1 / states[special[1]][2])));

		//try t-x intersect
		newLocs.push(linSolve(states[special[0]][0], states[special[0]][1],
				(Math.abs(states[special[0]][2]) < TOL ? 1 / TOL / TOL : 1 / states[special[0]][2]),
				states[special[1]][0], states[special[1]][1], states[special[1]][2]));
		//alert(special.join());

		//try t-t intersect
		if(Math.abs(states[special[0]][2] - states[special[1]][2]) > TOL)
		{
			newLocs.push(linSolve(states[special[0]][0], states[special[0]][1],
					(Math.abs(states[special[0]][2]) < TOL ? 1 / TOL / TOL : 1 / states[special[0]][2]),
					states[special[1]][0], states[special[1]][1],
					(Math.abs(states[special[1]][2]) < TOL ? 1 / TOL / TOL : 1 / states[special[1]][2])));
		}

		//add new intersect frames (temporarily)
		for(var i = 0; i < newLocs.length; i++)
		{
			for(var j = 0; j < 2; j++)
			{
				//check for newness
				var old = false;
				for(var k = 0; k < states.length; k++)
				{
					if(Math.abs(states[k][0] - newLocs[i][0]) < TOL &&
							Math.abs(states[k][1] - newLocs[i][1]) < TOL &&
							Math.abs(states[k][2] - states[special[j]][2]) < TOL)
					{
						old = true;
					}
				}
				if(!old)
				{
					states.push(newLocs[i].concat([states[special[j]][2]]));
					edits.push(newLocs[i].concat([states[special[j]][2]]));
					ticks.push(false);
				}
			}
		}
		update();

		specialCap = 3;
	}
	else if(special.length == specialCap && specialCap == 3)
	{
		//save the selected frame and delete others
		[states[keepFrames], states[special[2]]] = [states[special[2]], states[keepFrames]];
		[edits[keepFrames], edits[special[2]]] = [edits[special[2]], edits[keepFrames]];
		[ticks[keepFrames], ticks[special[2]]] = [ticks[special[2]], ticks[keepFrames]];
		keepFrames += 1;
		/*states.splice(keepFrames + 1);
		edits.splice(keepFrames + 1);
		ticks.splice(keepFrames + 1);*/

		//clear special and redraw
		/*special.splice(0);
		updateRF(keepFrames + 1);

		specialCap = 0;*/
		cancel();
		btnIntersect.style.borderStyle = "outset";
	}
}

//create new frames as lines drawn between points
function pointTowards()
{
	btnPointTo = document.getElementById("btnPointTo");
	doLockout("btnPointTo", false);
	if(getComputedStyle(btnPointTo).borderStyle === "outset")
	{
		specialCap = 2;
		btnPointTo.style.borderStyle = "inset";
	}
	else if(special.length == specialCap && specialCap == 2)
	{
		//check frames on light ray
		var dx = states[special[1]][0] - states[special[0]][0];
		var dy = states[special[1]][1] - states[special[0]][1];
		if(Math.abs(Math.abs(dx) - Math.abs(dy)) < TOL)
		{
			alert("You can't share time or space at light speed!");
			special.splice(0);
			specialCap = 0;
			btnPointTo.style.borderStyle = "outset";
			update();
			return;
		}

		//add frame
		states.push([states[special[0]][0], states[special[0]][1],
				(Math.abs(dx) > Math.abs(dy) ? dy / dx : dx / dy)]);
		edits.push([states[special[0]][0], states[special[0]][1],
				(Math.abs(dx) > Math.abs(dy) ? dy / dx : dx / dy)]);
		ticks.push(true);

		//select the new frame
		cancel();
		updateRF(states.length);
	}
}

/*
lockout/cancellation procedures
*/

var lockIds = "btnImport btnExport exportLink btnTransform btnRemove btnIntersect btnPointTo btnSave btnSaveNew";

//lock all but the used button
function doLockout(toKeep, stopMice = false)
{
	var locks = lockIds.split(' ');
	for(var i = 0; i < locks.length; i++)
	{
		if(locks[i] != toKeep)
		{
			document.getElementById(locks[i]).disabled = true;
		}
	}
	if(stopMice) lockout = true;
}

//unlock buttons and stop procedures
function cancel()
{
	special.splice(0);
	specialCap = 0;
	var locks = lockIds.split(' ');
	for(var i = 0; i < locks.length; i++)
	{
		document.getElementById(locks[i]).disabled = false;
		document.getElementById(locks[i]).style.borderStyle = "outset";
	}
	lockout = false;
	if(keepFrames != -1)
	{
		states.splice(keepFrames);
		edits.splice(keepFrames);
		ticks.splice(keepFrames);
		if(toFloat(document.getElementById("ref").value) > keepFrames - 1)
		{
			updateRF(keepFrames);
		}
		else update();
		keepFrames = -1;
	}
	else update();

	document.getElementById("edits").style.display = "none";
}

/*
load js elements
*/

update();
