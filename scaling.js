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
		document.getElementById(mode + "edit").value = expRound(scaleIn(mode, value));
	else
		document.getElementById(mode +"edit").value = "0e0";
}

//convert to exponential notation, with tolerance filter
function expRound(val)
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

/*
collect units
*/

var units = [];
var splitUnits = [[], []];
function unitLoad()
{
	var fr=new FileReader();
	fr.onload=function()
	{
		packs = fr.result.split("\n");

		//read distance units
		var block = 0;
		packs.forEach(function(pack)
		{
			if(pack.indexOf("=") == -1 && pack.length > 0)
			{
				units[pack] = 1;
				splitUnits[0].push(pack);
			}
			else if(pack.length > 0)
			{
				if(pack.indexOf("*") != -1)
					units[pack.substring(0, pack.indexOf(" = "))] =
							units[pack.substring(pack.indexOf(" = ") + 3, pack.indexOf(" * "))] *
							parseFloat(pack.substring(pack.indexOf(" * ") + 3));
				else
					units[pack.substring(0, pack.indexOf(" = "))] =
							units[pack.substring(pack.indexOf(" = ") + 3, pack.indexOf(" / "))] /
							parseFloat(pack.substring(pack.indexOf(" / ") + 3));
				splitUnits[block].push(pack.substring(0, pack.indexOf(" = ")));//@@
			}
		});
	}
	fr.readAsText("units");
}