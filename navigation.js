/*
params and data
*/

//mouse parameters
var LEFT = 1; //left button
var PT_CLOSE = 60;
var ZOOM_FACTOR = 1.07;
var oldMouseX = 0, oldMouseY = 0;
var mouseMode = 0;
var MOUSE_TIMEOUT = 1000;
var lockout = false;

var pointCache = new Array();
var prevPtrGap = 0;

//keep track of references
var refUpdate = 0, refUpdateSpecial = 0;
var oldRefVal = 1;


/*
mouse controls
*/

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
	{
		pan(event);
		memTimeout = (new Date()).getTime();
	}

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
	memTimeout = (new Date()).getTime();

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
touchscreen controls
*/

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
	{
		showClose({pageX: oldMouseX, pageY: oldMouseY});
		memTimeout = (new Date()).getTime();
	}
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

		memTimeout = (new Date()).getTime();
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
	if(pointCache.length == 1 && !lockout)
	{
		showClose({pageX: ptrX, pageY: ptrY});
		memTimeout = (new Date()).getTime();
	}
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
	if(pointCache.length > 0 && !lockout)
	{
		showClose({pageX: oldMouseX, pageY: oldMouseY});
		memTimeout = (new Date()).getTime();
	}
	oldMouseX -= canvRect.left;
	oldMouseY -= canvRect.top;
}

/*
form navigation
*/

//automatically load on user-driven RF# change
document.getElementById("ref").addEventListener("change", refchangeFn, false);
function refchangeFn()
{
	if(this.value.length < 1) this.value = 1;
	if(this.value.indexOf(".") >= 0) this.value = this.value.split(".")[0];
	if(parseFloat(this.value) - states.length > TOL) this.value = states.length;
	if(parseFloat(this.value) < 1) this.value = 1;
	
	if(lockout) this.value = oldRefVal;
	else
	{
		oldRefVal = parseFloat(this.value);
		update();
		refUpdate += 1;
		if(special.length < specialCap) checkSpecial();
	}
	memTimeout = (new Date()).getTime();
}

/*
mechanics
*/

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

	dist = DIM * 2;
	var closeLn = -1;
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
	update(closeLn + 1);
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
	document.getElementById("xmin").value = -dx + parseFloat(document.getElementById("xmin").value);
	document.getElementById("xmax").value = -dx + parseFloat(document.getElementById("xmax").value);
	document.getElementById("tmin").value = -dy + parseFloat(document.getElementById("tmin").value);
	document.getElementById("tmax").value = -dy + parseFloat(document.getElementById("tmax").value);
	update();
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
	update();
	canv.style.cursor = (pwr > 0 ? "zoom-out" : "zoom-in");

	//tweak tickmark scale
	update();
}

//check the selected frame for special-ness and store if needed
function checkSpecial()
{
	if(refUpdate == refUpdateSpecial) return; //don't update until user finishes entering number
	//(@@ not sure I trust this check against false exits...)
	refUpdateSpecial = refUpdate;
	var val = parseInt(document.getElementById("ref").value) - 1;
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