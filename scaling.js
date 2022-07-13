/*
handle scaling in the interface
*/

var xFactor = 1;
var tFactor = 1;// / 300000000;

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
	else if(Math.abs(value) > TOL)
		document.getElementById(mode + "edit").value = expNot(scaleIn(mode, value));
	else
		document.getElementById(mode +"edit").value = "0e0";
}

//convert to exponential notation, with tolerance filter
function expNot(val)
{
	var pwr = Math.floor(Math.log10(Math.abs(val)));
	val /= Math.pow(10, pwr);
	val = TOL * Math.round(val / TOL);
	var d = Math.floor(Math.log10(Math.abs(val)));
	while(Math.abs(d) > TOL)
	{
		pwr += d;
		val /= Math.pow(10, d);
		val = TOL * Math.round(val / TOL);
		d = Math.floor(Math.log10(Math.abs(val)));
	}
	return val + "e" + pwr;
}

//apply scale factors
function scaleIn(mode, value)
{
	switch(mode)
	{
		case "x":
			return parseFloat(value * xFactor);
		case "t":
			return parseFloat(value * tFactor);
		case "v":
			return parseFloat(value * xFactor / tFactor);
	}
}

//remove scale factors
function scaleOut(mode, value)
{
	switch(mode)
	{
		case "x":
			return parseFloat(value) / xFactor;
		case "t":
			return parseFloat(value) / tFactor;
		case "v":
			return parseFloat(value) * tFactor / xFactor;
	}
}