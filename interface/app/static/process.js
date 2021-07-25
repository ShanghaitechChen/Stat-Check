function myMove() {
    var elem = document.getElementById("rbox");
    var pos = 0;
    var id = setInterval(frame, 5);
    elem.style.opacity = 0;

    function frame() {
        if (pos == 75) {
            clearInterval(id);
            elem.style.opacity = 1;
        } else {
            pos++;
        }
    }
}

/*
function pickDefault(){
  if (document.getElementById("yaxisdd").value == "amount"){
    document.getElementById('statSelect').value = "average";
  }
  else if (document.getElementById("yaxisdd").value == "number of records") {
    document.getElementById('statSelect').value = "sum";
  }
}
*/
// initialize plot1

const in_attr_list = ["__ol"]; // internal attribute list; these attributes must NOT be directly shown to users

var graphDiv = document.getElementById('myDiv');

graphDiv.style.visibility = "hidden"

// initialize plot2

var graphDiv2 = document.getElementById('myDiv2');

var recDiv = document.getElementById('rbox')
rbox.style.display = "none"

var vlSpec;
var vlSpec2; // Yufan: be a global var for global communication.
var json_test;

var json_error = false;
var json_msg = null;

var var_name; // Ethan: made global
var var_axis = null; // Ethan: made global; should be "x" or "y"
var currentData = null; // The most recent data from the server

var missingTupleText = "";
var outlierTupleText = "";
var duplicateTupleText = "";
var numTuplesMissing = 0;
var numTuplesOutliers = 0;
var numTuplesDuplicates = 0;
const MAX_TUPLES_TEXT = 1000000000;

/******************************************************************************
 * This function will remove internal attributes (for internal use) from
 * the dictonary
 ******************************************************************************/

function filter_in_attr(x) {
    y = JSON.parse(JSON.stringify(x)) // deep copy
    for (var i = 0; i < in_attr_list.length; i++) {
        y[in_attr_list[i]] = undefined;
    }
    return y;
}

function getOS() {
    var userAgent = window.navigator.userAgent,
        platform = window.navigator.platform,
        macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
        windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
        iosPlatforms = ['iPhone', 'iPad', 'iPod'],
        os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'Mac OS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (!os && /Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}

/******************************************************************************
 * This function is called when the user change the value of
 * [id = "loadfile"] button.
 ******************************************************************************/

function load_spec_from_file() {
    let os = getOS();
    var fileInput = document.querySelector("#loadfile");
    var files = fileInput.files;
    var file = files[0];

    const name = fileInput.files[0].name;
    const lastDot = name.lastIndexOf('.');
    const fileName = name.substring(0, lastDot);
    const ext = name.substring(lastDot + 1);

    file.text().then(text => {
        document.getElementById("message").value = text;
        toggle2();
    })

}

/******************************************************************************
 * This function is called when the slider [id = "myRange"] is used
 ******************************************************************************/

var len_of_last_filtered = -1; // for checking if we are genearting the same graph

function range_slider_change() {
    /* value = 0 <=> thr = 95%
     * value = 1000 <=> thr = 100%
     * using QUADRATIC map rather than linear
     */
    var slider = document.getElementById("myRange");
    var x = 1 - slider.value / 1000.0;
    var thr = 1.0 - x * x * 0.05;

    /* display the threshold */
    var out = document.getElementById("myRangeText");
    out.innerHTML = (thr * 100).toFixed(3) + "%"

    /* filter the data according to thr */
    //console.log(typeof currentData);
    //console.log(currentData);
    var filtered = currentData.filter(function (value, index, arr) {
        return value["__ol"] < thr;
    });

    /* render if it is necessary */
    if (filtered.length != len_of_last_filtered) {
        // display outlier tuples as text
        outlierTupleText = "";
        numTuplesOutliers = 0;
        currentData.forEach(tuple => {
            if (tuple["__ol"] >= thr && numTuplesOutliers < MAX_TUPLES_TEXT - numTuplesDuplicates - numTuplesMissing) {
                tuple = filter_in_attr(tuple); // Yufan: filter out internal attributes
                outlierTupleText += JSON.stringify(tuple) + "<br>";
                numTuplesOutliers++;
            }
        })

        if (numTuplesDuplicates + numTuplesMissing + numTuplesOutliers > 0) {
            document.getElementById("flaggedData").innerHTML = "&bull; Here are the tuples in your dataset that have been flagged as erroneous."
                + " <br><br>"
                + outlierTupleText + missingTupleText + duplicateTupleText;
        } else {
            document.getElementById("flaggedData").innerHTML = "";
        }

        len_of_last_filtered = filtered.length;
        //var vlSpec2 = JSON.parse(JSON.stringify(vlSpec)); // Yufan: this way we have a CLONE rather than a MIRROR.
        vlSpec2.data.values = filtered;
        console.log(vlSpec2);
        vegaEmbed('#myDiv2', vlSpec2)
            .then((res) => res.view
                .renderer('svg')
                .run()
            );
    }
}

/******************************************************************************
 * This function is called when the dropdown for missing data [id = "missingDropdown"] is used
 ******************************************************************************/

// Code modeled after the above function
function missing_dropdown_change() {
    // console.log(typeof currentData);
    // console.log(currentData);

    var filtered;
    var dropdown = document.getElementById("missingDropdown");

    missingTupleText = "";
    numTuplesMissing = 0;

    key = var_name;
    filtered = Array();
    currentData.slice(0,-2).forEach((d, i) => {
        d_new = JSON.parse(JSON.stringify(d)) // deep copy
        if ((d[key] == "NA" || d[key] == "null" || d[key] == null || d[key] == "N/A" || d[key] == "NaN") && i < currentData.length - 2) {
            if (dropdown.value == "replace") {
                d_new[key] = 0;
            }
            if (numTuplesMissing < MAX_TUPLES_TEXT - numTuplesDuplicates - numTuplesOutliers) {
                d = filter_in_attr(d); // Yufan: filter out internal attributes
                missingTupleText += JSON.stringify(d) + "<br>";
                numTuplesMissing++;
            }
        }
        filtered.push(d_new);
        if (numTuplesDuplicates + numTuplesMissing + numTuplesMissing > 0) {
            document.getElementById("flaggedData").innerHTML = "Here are the tuples in your dataset that have been flagged as erroneous."
                + " <br><br>"
                + outlierTupleText + missingTupleText + duplicateTupleText;
        }
    });
    vlSpec2.data.values = filtered;

    if (dropdown.value == "omit") {
        vlSpec2.data.values = currentData.slice(0, -2);
        for (var i = vlSpec2.data.values.length - 1; i >= 0; i--) {
            var d = vlSpec2.data.values[i];
            if ((d[key] == "NA" || d[key] == "null" || d[key] == null || d[key] == "N/A" || d[key] == "NaN")) {
                vlSpec2.data.values.splice(i, 1);
            }
        }
    }

    // console.log(vlSpec2);
    vegaEmbed('#myDiv2', vlSpec2)
        .then((res) => res.view
            .renderer('svg')
            .run()
        );
}

/******************************************************************************
 * This function is called when the dropdown for missing data [id = "duplicateDropdown"] is used
 ******************************************************************************/

// Code modeled after the above function
function duplicate_dropdown_change() {
    // console.log(typeof currentData);
    // console.log(currentData);

    var dropdown = document.getElementById("duplicateDropdown");
    var val = dropdown.value;

    let aggregateDropdown = document.getElementById("duplicateAggregateDropdown");
    let aggregateVal = "";
    if (val == "aggregate") {
        aggregateDropdown.style.display = "";
        aggregateVal = aggregateDropdown.value;
    } else {
        aggregateDropdown.style.display = "none";
    }

    duplicateTupleText = "";
    numTuplesDuplicates = 0;

    key = Object.keys(currentData[0])[0];
    keys = Array();
    dupes = Array();
    currentData.forEach(tuple => {
        v = tuple[key];
        if (v != undefined) {
            if (!keys.includes(v)) {
                keys.push(v)
            } else {
                dupes.push(v);
            }
        }
    });
    filtered = currentData.filter(tuple => {
        return !dupes.includes(tuple[key]);
    })
    currentData.forEach(tuple => {
        if (dupes.includes(tuple[key]) && numTuplesDuplicates < MAX_TUPLES_TEXT - numTuplesMissing - numTuplesOutliers) {
            tuple = filter_in_attr(tuple); // Yufan: filter out internal attributes
            duplicateTupleText += JSON.stringify(tuple) + "<br>";
            numTuplesDuplicates++;
        }
    })
    vlSpec2.data.values = filtered;
    vlSpec2.encoding[var_axis].aggregate = "none";

    if (numTuplesDuplicates + numTuplesMissing + numTuplesMissing > 0) {
        console.log("printing");
        document.getElementById("flaggedData").innerHTML = "Here are the tuples in your dataset that have been flagged as erroneous."
            + "<br><br>"
            + outlierTupleText + missingTupleText + duplicateTupleText;
    }
    if (val == "aggregate") {
        vlSpec2.data.values = currentData.slice(0, -2);
        vlSpec2.encoding[var_axis].aggregate = aggregateVal;
    }

    // console.log(vlSpec2);
    vegaEmbed('#myDiv2', vlSpec2)
        .then((res) => res.view
            .renderer('svg')
            .run()
        );
}

/******************************************************************************
 * This function is called when the user click the
 * [id = "omit_" + [symptom]] button. Please note that this button is
 * auto-generated by JS.
 ******************************************************************************/

var omitted_symptom_list = [];

function omit(symptom) {
    console.log("DEBUG: I will additionally omit the following symptom:" + symptom);
    if (!omitted_symptom_list.includes(symptom)) {
        omitted_symptom_list.push(symptom);
    }
    process(omitted_symptom_list);
}

/*
*  Function to process drop down menus with prefab vegalite specs to illustrate range of issues
*/

function DemoCode() {
    var problem = document.getElementById("statSelect").value;
    console.log(problem);
    var chart_type = document.getElementById("chart").value;
    var myData;
    var field;

    if (problem == "asym") {
        myData =
            [
                {"month": "01", "cnt": 28}, {"month": "01", "cnt": 14}, {"month": "01", "cnt": 14}, {
                "month": "01",
                "cnt": 5
            },
                {"month": "02", "cnt": 7}, {"month": "02", "cnt": 125}, {"month": "02", "cnt": 25}, {
                "month": "02",
                "cnt": 46
            },
                {"month": "10", "cnt": 89}, {"month": "10", "cnt": 22}//,{"month":"10","cnt":646},{"month":"10","cnt":2216}
            ];
        field = "cnt";
    } else if (problem == "outliers") {
        myData =
            [
                {"month": "01", "amount": 28}, {"month": "02", "amount": 14}, {
                "month": "03",
                "amount": 14
            }, {"month": "04", "amount": 5},
                {"month": "05", "amount": 7}, {"month": "06", "amount": 22}, {
                "month": "07",
                "amount": 46
            }, {"month": "08", "amount": 46},
                {"month": "09", "amount": 39}, {"month": "10", "amount": 218}, {
                "month": "11",
                "amount": 646
            }, {"month": "12", "amount": 2216}
            ];
        field = "amount";
    } else if (problem == "missing") {
        console.log("missing");
        /*
        myData =
              [{"month":"01","amount":NaN},{"month":"02","amount":14},{"month":"03","amount":14},{"month":"04","amount":5},
              {"month":"05","amount":7},{"month":"06","amount":22},{"month":"07","amount":46},{"month":"08","amount":46},
              {"month":"09","amount":39}, {"month":"10","amount":218},{"month":"11","amount":646},{"month":"12","amount":2216}
             ];
        field = "amount";
        */
        myData =
            [
                {"month": "01", "cnt": NaN}, {"month": "01", "cnt": 14}, {"month": "01", "cnt": 14}, {
                "month": "01",
                "cnt": 5
            },
                {"month": "02", "cnt": 7}, {"month": "02", "cnt": 22}, {"month": "02", "cnt": 46}, {
                "month": "02",
                "cnt": 46
            },
                {"month": "10", "cnt": 39}, {"month": "10", "cnt": 75}//,{"month":"10","cnt":646},{"month":"10","cnt":2216}
            ];
        field = "cnt";
    } else if (problem == "duplicates") {
        myData =
            [
                {"month": "01", "amount": 28},
                {"month": "03", "amount": 14},
                {"month": "05", "amount": 7},
                {"month": "07", "amount": 46},
                {"month": "09", "amount": 39},
                {"month": "11", "amount": 10}, {"month": "11", "amount": 50}
            ];
        field = "amount";
    } else if (problem == "none") {
        myData =
            [
                {"month": "01", "total": 28}, {"month": "02", "total": 14}, {
                "month": "03",
                "total": 14
            }, {"month": "04", "total": 5},
                {"month": "05", "total": 7}, {"month": "06", "total": 22}, {"month": "07", "total": 46}, {
                "month": "08",
                "total": 46
            },
                {"month": "09", "total": 39}, //{"month":"10","total":75} //,{"month":"11","total":646},{"month":"12","total":2216}
            ];
        field = "total";
    }
    // make normal plot
    //console.log(" ###### testing js NEW ########### ");

    vlSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
        "data": {
            "values": myData
        },
        "mark": chart_type,
        "encoding": {
            "x": {"field": "month", "type": "nominal"},
            "y": {"field": field, "type": "quantitative"}
        }
    };

    if (problem != "duplicates" && problem != "outliers") {
        vlSpec.encoding.y.aggregate = "average"
    }
    //  console.log(JSON.stringify(vlSpec))
    document.getElementById("message").value = JSON.stringify(vlSpec, null, 2);
    toggle2();
}

function toggle() {
    if (document.getElementById("loadfile").value) {
        toggle2();
    } else {
        DemoCode();
        omitted_symptom_list = []; // reset the list since the user seems to start a new query
        process(omitted_symptom_list);
    }
}

function btn_update_onclick() {
    var x = JSON.parse(JSON.stringify(vlSpec2));
    for (var i = 0; i < in_attr_list.length; i++) {
        for (var j = 0; j < x.data.values.length; j++) {
            //console.log(j);
            x.data.values[j][in_attr_list[i]] = undefined;
        }
    }
    document.getElementById("message").value = JSON.stringify(x, null, 2);
    toggle2();
}

/*
* process case when input is vega-lite spec from text box
*/
function toggle2() {

    var input_text = document.getElementById("message").value;

    try {
        vlSpec = JSON.parse(input_text);
        json_error = false;
    } catch (e) {
        json_error = true;
        json_msg = `${e.name}: ${e.message}`
        console.log(json_msg);
    }

    omitted_symptom_list = []; // reset the list since the user seems to start a new query
    process(omitted_symptom_list);

}

/******************************************************************************
 * This function is used to insert a button using JS in the "rtext" <p> section
 ******************************************************************************/

function insert_omit_button(explanation_string, symptom) {
    return explanation_string + '<input type="image" width="15px" style="position: relative; top: 2px;" src="/static/close.png" id="omit_' +
        symptom + '" onclick="omit(\'' + symptom + '\')"> <nbsp>'
}

/******************************************************************************
 * This function is used to insert a button using JS in the "rtext" <p> section
 ******************************************************************************/

function process(omitted_symptom_list) {
    if (json_error) {
        console.log(json_msg);
        document.getElementById('mainchart').style.display = "none";
        document.getElementById('rbody').style.display = "none";
        document.getElementById('rbox').style.display = "inline-block";
        document.getElementById('rhead').innerHTML = '<img src="/static/exclamation-mark.png" style="width: 50px;">';
        document.getElementById('rtext').innerHTML = json_msg;
        return;
    } else {
        document.getElementById('mainchart').style.display = "inline-block";
        document.getElementById('rbody').style.display = "";
    }

    console.log(vlSpec.encoding.y.aggregate);

    vlSpec2 = JSON.parse(JSON.stringify(vlSpec)); // Yufan: this way we have a CLONE rather than a MIRROR.

    len_of_last_filtered = -1; // This way our slider renderer in range_slider_range() will NOT be lazy

    /* display given vega-lite graph (based on toggle/toggle2)*/
    vegaEmbed('#myDiv', vlSpec)
        .then((res) => res.view
            .renderer('svg')
            .run()
        );
    graphDiv.style.visibility = "visible"

    // reset all text info, since we have new data
    missingTupleText = "";
    outlierTupleText = "";
    duplicateTupleText = "";
    numTuplesMissing = 0;
    numTuplesOutliers = 0;
    numTuplesDuplicates = 0;
    document.getElementById("flaggedData").innerHTML = "";

    /* Yufan: find the quantitative column */
    // WARNING: cuurently the code malfunctions when there are more than one column located
    if (vlSpec.encoding.x != undefined && vlSpec.encoding.x.type == "quantitative") {
        var_name = vlSpec.encoding.x.field;
        var_axis = "x";
    } else if (vlSpec.encoding.y != undefined && vlSpec.encoding.y.type == "quantitative") {
        var_name = vlSpec.encoding.y.field;
        var_axis = "y";
    } else {
        alert("I cannot find a quantitative column!");
    }

    let multi_quantitative = false;
    if (vlSpec.encoding.x != undefined && vlSpec.encoding.x.type == "quantitative"
        && vlSpec.encoding.y != undefined && vlSpec.encoding.y.type == "quantitative") {
        multi_quantitative = true;
    }

    /* prep vars for passing to python */
    var data_str = JSON.stringify(vlSpec.data.values); //a stringified version of the data in the vega-lite spec
    //var var_name = vlSpec.encoding.y.field; //pull out field to run stats over
    var label_name = null;
    if (vlSpec.encoding.hasOwnProperty('color')) {
        label_name = vlSpec.encoding.color.field;
    }
    var omit_str = JSON.stringify(omitted_symptom_list);

    /* string that routes to test_json function in routes.py
    * passes the data in "json_str" and the variable name for stats in "var_name"
    */
    json_test = '/test_json?json_str=' + data_str + '&var_name=' + var_name + '&label_name=' + label_name + '&omit_str=' + omit_str + '&multi_quantitative=' + multi_quantitative;

    //console.log("*********** Original Data: **********");
    //console.log(data_str);

    /* actually makes the call to the python function via app.route
     * passes data and variable name
     * gets new (filtered if appropriate) data and flags array
    */
    $.get(json_test, function (data) {
        //console.log("*********** Processed Data: **********");
        //console.log(data);
        currentData = JSON.parse(data); // save it as a global variable for future needs

        // make recommendation plot
        var xaxis = []
        var yaxis = []
        data1 = JSON.parse(data); //make array that allows separating the data from the flags
        var count_records = data1.length - 2 // number of actual data records -- needed to separate data from flags

        var agg = vlSpec.encoding[var_axis].aggregate; //pull out aggregation from original spec -- needed for recommendation when asym distrib
        var flags = data1[count_records]; //flags are last item in data returned from python
        var suggestion = data1[data1.length - 1];
        var explanation_string = ""; //string that will hold the explanations and recommendations
        console.log(flags);

        /* check flags and change recommendations accordingly */
        if (flags.notnormal > 0 && agg == "average") {
            if (explanation_string != '') {
                explanation_string = explanation_string + "<br><br>";
            }
            /* add button for users to omit this detected problem */
            explanation_string = insert_omit_button(explanation_string, "notnormal");
            /* append text */
            explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Asymmetrical Distribution:</b></span> \
        Your data distribution is skewed (the total average is not lying in the middle third of the data distribution), which disproportionately affects the AVERAGE. <b>You may want to use the MEDIAN measure instead, as shown below.</b>';
            agg = "median"; //if the distribution is not normal, change aggregation to median (per recommendation)

        }
        if (flags.outliers > 0) {
            document.getElementById("myRangeContainer").style.display = "inline"; // show the range slider
            percentage_outliers = flags.outliers * 100 / (count_records + flags.outliers);
            if (explanation_string != '') {
                explanation_string = explanation_string + "<br><br>";
            }
            /* add button for users to omit this detected problem */
            explanation_string = insert_omit_button(explanation_string, "outliers");
            /* append text */

            if (data1[count_records].outliers == 1) {
                explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Outliers:</b></span> \
            There is ' + data1[count_records].outliers + ' (' + percentage_outliers.toFixed(2) + '%)' + ' outliers in your data that may greatly affect the view of the visualization. An outlier should not appear in the data with probability 95% <em> under the assumption that the data follows a nomral distribution</em>. <b>You might want to filter them as shown below, or change the threshold probability 95%.</b>';

            } else {
                explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Outliers:</b></span> \
            There are ' + data1[count_records].outliers + ' (' + percentage_outliers.toFixed(2) + '%)' + ' outliers in your data that may greatly affect the view of the visualization. An outlier should not appear in the data with probability 95% <em> under the assumption that the data follows a nomral distribution</em>. <b>You might want to filter them as shown below, or change the threshold probability 95%.</b>';

            }


        } else {
            document.getElementById("myRangeContainer").style.display = "none"; // hide the range slider
        }

        if (flags.duplicates > 0 && agg == undefined) {
            document.getElementById("duplicateDropdownContainer").style.display = "inline"; // show the range slider
            if (explanation_string != '') {
                explanation_string = explanation_string + "<br><br>";
            }
            /* add button for users to omit this detected problem */
            explanation_string = insert_omit_button(explanation_string, "duplicates");
            /* append text */
            explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Duplicate Values:</b></span> \
      Your dataset contains multiple entries that have the same independent variable. Consider aggragating these values, or manually fixing them.'
        } else {
            document.getElementById("duplicateDropdownContainer").style.display = "none"; // show the range slider
        }

        if (suggestion.label !== null) {
            if (explanation_string != '') {
                explanation_string = explanation_string + "<br><br>";
            }
            /* add button for users to omit this detected problem */
            explanation_string = insert_omit_button(explanation_string, "label");
            /* append text */
            explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Data Distribution:</b></span> \
      Warning, we detected no statistically significant difference between the distributions for the input label. \
      <b>We found another label in the dataset with statistically significant difference between the distributions, you may want to use it, as shown below.</b>';
            if (vlSpec.encoding.hasOwnProperty('color')) {
                vlSpec2.encoding.color.field = suggestion.label;
            }
        }

        if (suggestion.scale !== null && (vlSpec2.encoding.x.scale == null || vlSpec2.encoding.y.scale == null)) {
            if (explanation_string != '') {
                explanation_string = explanation_string + "<br><br>";
            }
            explanation_string = explanation_string + '<span style="color:#E2574C;"><b>Feature scaling:</b></span> \
            The range of independent variables in your dataset varies widely. Consider using scale domains.'

            vlSpec2.encoding.x.scale = {"domain": [0, 1]}
            vlSpec2.encoding.x.scale.domain = [suggestion.scale.min, suggestion.scale.max]
            vlSpec2.encoding.y.scale = {"domain": [0, 1]}
            vlSpec2.encoding.y.scale.domain = [suggestion.scale.min, suggestion.scale.max]
        }

        /* decide color and layout of warning/error/ok flags */
        if (flags.missing > 0) {
            graphDiv2.style.display = "inline"
            document.getElementById("missingDropdownContainer").style.display = "inline";
            document.getElementById("btn_update").style.display = "inline";
            percentage_nulls = flags.missing * 100 / (count_records + flags.missing);
            document.getElementById('rbox').style = "border: 3px solid #FFDA6B;";
            document.getElementById('rhead').innerHTML = '<img src="/static/exclamation.png" style="width: 50px;">';
            /* add button for users to omit this detected problem */
            //document.getElementById('rtext').innerHTML = insert_omit_button("", "missing");
            // Yufan: we CANNOT let users omit this problem.
            document.getElementById('rtext').innerHTML = "";
            /* append text */

            if (data1[count_records].missing == 1) {
                document.getElementById('rtext').innerHTML = document.getElementById('rtext').innerHTML + '<span style="color:#E29E4C;"><b>Missing Values:</b></span>\
        There is ' + data1[count_records].missing + ' (' + percentage_nulls.toFixed(2) + '%)' + ' missing entries in your data. ';
            } else {
                document.getElementById('rtext').innerHTML = document.getElementById('rtext').innerHTML + '<span style="color:#E29E4C;"><b>Missing Values:</b></span>\
        There are ' + data1[count_records].missing + ' (' + percentage_nulls.toFixed(2) + '%)' + ' missing entries in your data. ';
            }

            // <b>You might want to filter them as shown below.</b>';

        } else if (explanation_string != "") {
            graphDiv2.style.display = "inline"
            document.getElementById("missingDropdownContainer").style.display = "none";
            document.getElementById("btn_update").style.display = "inline";
            document.getElementById('rtext').innerHTML = explanation_string;
            document.getElementById('rbox').style = "border: 3px solid #E2574C;";
            document.getElementById('rhead').innerHTML = '<img src="/static/exclamation-mark.png" style="width: 50px;">';

        } else {
            // make recommendation (no recommendation in this case)
            graphDiv2.style.display = "none"
            document.getElementById("missingDropdownContainer").style.display = "none";
            document.getElementById("btn_update").style.display = "none";

            // change recommendation text
            document.getElementById('rbox').style = "border: 3px solid #3DB39E;";
            document.getElementById('rhead').innerHTML = '<img src="/static/checked.png" style="width: 50px;">';
            document.getElementById('rtext').innerHTML = 'No issues found with this visualization.';

        }

        /* remind the user that she may have chosen to omit some problems */
        if (omitted_symptom_list.length > 0) {
            var shown_text = "";
            if (omitted_symptom_list.includes("notnormal")) {
                shown_text = shown_text + "Asymmetrical Distribution, ";
            }
            if (omitted_symptom_list.includes("outliers")) {
                shown_text = shown_text + "Outliers, ";
            }
            if (omitted_symptom_list.includes("duplicates")) {
                shown_text = shown_text + "Dupcliate Values, ";
            }
            if (omitted_symptom_list.includes("label")) {
                shown_text = shown_text + "Data Distribution (for Label Recommendation), ";
            }
            if (omitted_symptom_list.includes("missing")) {
                shown_text = shown_text + "Missing Values, ";
            }
            /* remove redundant ", " */
            if (shown_text != "") {
                shown_text = shown_text.slice(0, -2);
            }
            document.getElementById('rtext').innerHTML = document.getElementById('rtext').innerHTML +
                '<br><br> <em>You have chosen to omit following checks: ' + shown_text + '.</em>';
        }

        console.log("afr " + vlSpec.encoding.y.aggregate);

        vlSpec2.data.values = data1.slice(0, count_records);
        vlSpec2.encoding[var_axis].aggregate = agg;

        console.log("af " + vlSpec.encoding.y.aggregate);

        //console.log(vlSpec2.data.values);


        // Use the special renderer if needed, otherwise, render normally
        if (flags.outliers > 0) {
            var slider = document.getElementById("myRange");
            slider.value = 0;
            range_slider_change();
        }
        if (flags.missing > 0) {
            var dropdown = document.getElementById("missingDropdown");
            dropdown.value = "omit";
            missing_dropdown_change();
        }
        if (flags.duplicates > 0 && agg == undefined) { // Yufan: "&& agg == undefined" is necessary
            var dropdown = document.getElementById("duplicateDropdown");
            dropdown.value = "aggregate";
            duplicate_dropdown_change();
        } else {
            vegaEmbed('#myDiv2', vlSpec2)
                .then((res) => res.view
                    .renderer('svg')
                    .run()
                );
        }


    })
    myMove()


}
