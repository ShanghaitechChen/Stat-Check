from flask import Flask, render_template, jsonify
from flask.json import dumps
from flask.json import request
from app import app

import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
import datetime
from .stats import *
import json
import time
from colorama import Fore, Style  # for colored debug message
import distutils.util


###############################################################################
# print a debug message
###############################################################################

def debugMsg(str):
    print(Fore.CYAN + Style.BRIGHT + "[DEBUG]", end=' ')
    print(str, end='')
    print(Style.RESET_ALL)


###############################################################################
# flask server definition begins here
###############################################################################

@app.route('/')
@app.route('/index')
def intro():
    return render_template('index.html')
    # return render_template('slider.html')


@app.route('/intviz')
def slider():
    return render_template('slider.html')


#######################################################
# process data passed from javascript
# run stats functions and filter data accordingly
#######################################################
@app.route('/test_json', methods=["GET"])
def parse_json():
    data_list = []  # list that is passed to stats functions
    filtered_data = []  # data filtered out
    data_outliers = []
    flags = {}
    flags['notnormal'] = 0
    flags['outliers'] = 0
    flags['missing'] = 0
    flags['noise'] = 0

    suggestion = {}
    suggestion["label"] = None
    suggestion["scale"] = None

    var_name = request.args.get('var_name')
    # print(var_name)

    label_name = request.args.get('label_name')

    multi_quantitative = request.args.get('multi_quantitative')

    raw_data = json.loads(request.args.get('json_str'))
    omitted_symptom_list = json.loads(request.args.get('omit_str'))
    # table_dict = json.loads(raw_data)
    # print(" @@@@@@@@@@@@@@@@@@@@@ " )
    # debugMsg(raw_data)
    # print(table_dict)
    # print(type(table_dict))
    # print("************")
    for item in raw_data:
        data_list.append(item[var_name])
    # print(data_list)

    # print(" @@@@@@@@@@@@@@@@@@@@@ " )

    # Suleyman: Significance check, in progress
    if label_name != "null" and "label" not in omitted_symptom_list:
        pass
        # suggestion["label"] = check_significance(raw_data, label_name)

    # Suleyman: Scale check
    if bool(distutils.util.strtobool(multi_quantitative)):
        # print(f"### multi_quantitative ###")
        suggestion["scale"] = check_scale(raw_data)

    # Yufan: the data is no longer "raw" since some attributes are added.
    #        But we do not change the name for convenience
    raw_data, data_outliers = outlier_likelihood(data_list, raw_data, var_name)
    # debugMsg(raw_data)

    # %CSA: programming note: if we can compare the number of records in the original query with the number of records in the non-null query, we should be able to pass back the number of nulls to the front-end, so it can flag a different display that clues the user into how many nulls we have. - %RS DONE
    # change missing to return the list of missing, like the outliers (and adjust code to take the len to return to front-end)

    if "missing" not in omitted_symptom_list:
        flags['missing'] = missing_entries(data_list)

    if "duplicates" not in omitted_symptom_list:
        flags['duplicates'] = duplicate_entries(raw_data)

    # print(flags['missing'])

    if flags['missing'] == 0:
        if is_asym(data_list) and "notnormal" not in omitted_symptom_list:
            flags['notnormal'] = 1
        if "outliers" not in omitted_symptom_list:
            flags['outliers'] = len(data_outliers)

    # Yufan: no longer filtering data, but instead giving appended information for the client to compute outliers
    # for item in raw_data:
    #  if item[var_name] not in data_outliers:
    #      filtered_data.append(item)
    filtered_data = raw_data

    filtered_data.append(flags)
    # print(filtered_data)
    # df = pd.DataFrame(filtered_data).to_json(orient='records')

    filtered_data.append(suggestion)

    filtered_json = json.dumps(filtered_data)
    # print(filtered_json)

    # debugMsg(filtered_json)
    return filtered_json
