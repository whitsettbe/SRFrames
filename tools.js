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
		update(states.length);
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
		update(toFloat(states.length));

		cancel();
	}
}

//delete a reference frame
function remove()
{
	var idx = toFloat(document.getElementById("ref").value) - 1;
	if(states.length == 1)
	{
		alert("You must have at least one reference frame!");
		return;
	}
	else if(idx < 0 || states.length <= idx || Math.abs(idx - Math.round(idx)) > TOL)
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
			update(idx);
		else
			update();
	}
}

/*
helper fns
*/

var lockIds = "btnImport btnExport exportLink btnTransform btnRemove btnIntersect btnPointTo btnSave btnSaveNew";

//function to solve linear equations
function linSolve(x0, y0, m0, x1, y1, m1)
{
	var ma = toFloat(-m0), mb = toFloat(-m1);
	var a = toFloat(y0 - m0 * x0), b = toFloat(y1 - m1 * x1);
	return [toFloat((a - b) / (ma - mb)), toFloat((b * ma - a * mb) / (ma - mb))];
}

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
			update(keepFrames);
		}
		else update();
		keepFrames = -1;
	}
	else update();

	document.getElementById("edits").style.display = "none";
}
