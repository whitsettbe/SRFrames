//collect all update functions in a single call
function update(newVal = "")
{
	updateCoord();
	if(newVal != "")
	{
		document.getElementById("ref").value = newVal;
		//load();
		redraw();
		relist();
		refUpdate += 1;
	}
	else
	{
		//load();
		redraw();
		relist();
	}
}

/*
relist / load functionality
*/

//update the bounding coordinates of the canvas window
function updateCoord()
{
	/*if(parseFloat(document.getElementById("xmin").value) < parseFloat(document.getElementById("xmax").value) &&
			parseFloat(document.getElementById("tmin").value) < parseFloat(document.getElementById("tmax").value) &&
			parseFloat(document.getElementById("xstep").value) > 0 &&
			parseFloat(document.getElementById("tstep").value) > 0)*/
	{
		/*xMin = parseFloat(document.getElementById("xmin").value);
		xMax = parseFloat(document.getElementById("xmax").value);
		tMin = parseFloat(document.getElementById("tmin").value);
		tMax = parseFloat(document.getElementById("tmax").value);*/
		document.getElementById("xstep").value = expRound(Math.pow(10, Math.round(Math.log(
				scaleIn("x", xMax - xMin) / 2) / Math.log(10)) - 1));
		document.getElementById("tstep").value = expRound(Math.pow(10, Math.round(Math.log(
				scaleIn("t", tMax - tMin) / 2) / Math.log(10)) - 1));
		xStep = parseFloat(document.getElementById("xstep").value);
		tStep = parseFloat(document.getElementById("tstep").value);
		//update();
	}
	/*else
	{
		alert("Invalid coordinate values");
	}*/
}


//re-list numbers in the reference frame list
function relist()
{
	/*//catch not enough decimals
	for(var i = 0; i < states.length; i++)
	{
		if(parseInt(Math.log10(Math.abs(scaleIn("x", states[i][0])))) > numDec)
			numDec = parseInt(Math.log10(Math.abs(scaleIn("x", states[i][0]))));
		if(parseInt(Math.log10(Math.abs(scaleIn("t", states[i][1])))) > numDec)
			numDec = parseInt(Math.log10(Math.abs(scaleIn("t", states[i][1]))));
		if(parseInt(Math.log10(Math.abs(scaleIn("v", states[i][2])))) > numDec)
			numDec = parseInt(Math.log10(Math.abs(scaleIn("v", states[i][2]))));
	}*/

	var out = "<pre>  #  +  x"+" ".repeat(numDec + 5)+"  t"+" ".repeat(numDec + 5)+"  v<br>";
	for(var i = 0; i < states.length; i++)
	{
		out += (Math.abs(states[i][0]) < TOL && Math.abs(states[i][1]) < TOL &&
		    	Math.abs(states[i][2]) < TOL ? "> " : "  ") + (i + 1) + "  " +
				(ticks[i] ? "#" : "-") + " " + numForm("x", states[i][0]) + " " +
				numForm("t", states[i][1]) + " " + numForm("v", states[i][2]) + "<br>";
	}
	document.getElementById("states").innerHTML = out + "</pre>";
}

//format number for printing
function numForm(mode, num)
{
	var out;
	if(Math.abs(num) > TOL)
		out = expRound(scaleIn(mode, num));
	else
		out = "0e0";
	var front = parseFloat(out.substring(0, out.indexOf("e"))).toFixed(numDec);
	front = (parseFloat(front) < 0 ? "" : " ") + front;
	var exp = parseInt(out.substring(out.indexOf("e") + 1));

	//catch rollover in toFixed
	if(front.indexOf(".") > 2)
	{
		front = (parseFloat(front) / 10).toFixed(numDec);
		front = (parseFloat(front) < 0 ? "" : " ") + front;
		exp += 1;
	}

	return (front + "e" + exp + "  ").substring(0, 7 + numDec);
/*	//@@filled with errors...
	//move scaleIn call here so we can check <TOL 0 case
	//use expRound, capture the decimal value from the result
	//toFixed adjusts the decimal, then reconcat
	//check in case of rollover to adjust exponent
	var out = expRound(parseFloat(num));
	if(out.indexOf(".") == -1) out += ".";
	out += "0".repeat(numDec);
	var carry = (out[out.indexOf(".")+numDec+1] > "4");
	out = out.substring(0, out.indexOf(".")+numDec+1);
	var d = numDec;
	while(carry > 0)
	{
		var newCarry = parseInt((carry + parseInt(out[out.indexOf(".")+d])) / 10);
		out = out.substring(0, out.indexOf(".") + d) +
				((carry + parseInt(out[out.indexOf(".")+d])) % 10) +
				out.substring(out.indexOf(".") + d + 1);
		d--;
	}
	return ((out.startsWith("-") ? "" : " ") + out + " ").substring(0, 7 + numDec);*/
}

//pull frame info from the form's frame index
function load()
{
	var idx = parseInt(document.getElementById("ref").value) - 1;
	if(0 <= idx && idx < states.length && Math.abs(idx - Math.round(idx)) < TOL)
	{
		setEdit("x", states[idx][0]);
		setEdit("t", states[idx][1]);
		setEdit("v", states[idx][2]);
		setEdit("ax", ticks[idx]);
	}
	else
	{
		alert("Invalid reference frame index.");
	}
}

/*
redraw functionality
*/

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
	ctx.lineWidth = oldLineWidth * 1.5;
	ctx.strokeStyle = "#FF0000";
	draw(states[parseInt(document.getElementById("ref").value) - 1], true, true, true, false,
			ticks[parseInt(document.getElementById("ref").value) - 1]);

	//reset draw settings
	ctx.lineWidth = oldLineWidth;
	ctx.strokeStyle = oldStrokeStyle;
}

//draw state with desired point, axes, light rays, and tick mark options
function draw(state, p = true, x = true, t = true, lt = false, tick = true)
{
	if(p) drawP(state);
	if(x) drawX(state, tick);
	if(t) drawT(state, tick);
	if(lt) drawLight(state);
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

//draw point given coordinates
function drawP(state)
{
	ctx.beginPath();
	ctx.arc(xScale(state[0]), tScale(state[1]), PT_RAD, 0, 2 * Math.PI);
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
		var step = scaleOut("x", xStep) / Math.sqrt(1 - state[2] * state[2]);
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
		var step = scaleOut("t", tStep) / Math.sqrt(1 - state[2] * state[2]);
		for(var i = step * Math.ceil((tMin - state[1]) / step) + state[1], j = (tMax - i) / (tMax - tMin);
				i <= tMax; i += step, j = (tMax - i) / (tMax - tMin))
		{
			drawTick(xScale(state[0] + state[2] * (tMin * j + tMax * (1 - j) - state[1])),
					tScale(tMin * j + tMax * (1 - j)), state[2]);
		}
	}
}

//draw tick mark given location (in pixels) and slope
function drawTick(x, t, slp)
{
	ctx.beginPath();
	ctx.moveTo(x - COORD_RAD / Math.sqrt(1 + slp * slp), t - COORD_RAD * slp / Math.sqrt(1 + slp * slp));
	ctx.lineTo(x + COORD_RAD / Math.sqrt(1 + slp * slp), t + COORD_RAD * slp / Math.sqrt(1 + slp * slp));
	ctx.stroke();
}

/*
handle coordinate transforms
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
