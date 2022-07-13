/*
handle scaling in the interface
*/

var xFactor = 173;
var tFactor = 1;

//retrieve from the edit boxes, unscaling as we go
function getEdit(mode)
{
	if(mode === "ax")
		return document.getElementById("ax").checked;
	else
		return scaleOut(mode, document.getElementById(mode + "edit").value);
}

//set the edit boxes, scaling as we go
function setEdit(mode, value)
{
	if(mode === "ax")
		document.getElementById("ax").checked = value;
	else
		document.getElementById(mode + "edit").value = scaleIn(mode, value);
}

//apply scale factors
function scaleIn(mode, value)
{
	switch(mode)
	{
		case "x":
			return toFloat(value * xFactor);
		case "t":
			return toFloat(value * tFactor);
		case "v":
			return toFloat(value * xFactor / tFactor);
	}
}

//remove scale factors
function scaleOut(mode, value)
{
	switch(mode)
	{
		case "x":
			return toFloat(value) / xFactor;
		case "t":
			return toFloat(value) / tFactor;
		case "v":
			return toFloat(value) * tFactor / xFactor;
	}
}