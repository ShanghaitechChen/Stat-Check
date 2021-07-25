import numpy as np
import scipy
import scipy.stats
import numpy
import zipcodes
import pandas as pd
from math import erf, sqrt
from scipy.stats import ttest_ind


def average(values_list):
    elements = numpy.array(values_list)
    mean = numpy.mean(elements, axis=0)
    return mean


def std_dev(values_list):
    elements = numpy.array(values_list)
    std = numpy.std(elements, axis=0)
    return std


def normal_dist_68_rule(values_list):
    elements = numpy.array(values_list)
    mean = numpy.mean(elements, axis=0)
    std = numpy.std(elements, axis=0)

    outside_1_list = [x for x in elements if (x > mean - 1 * std)]
    outside_1_list = [x for x in outside_1_list if (x < mean + 1 * std)]

    percentage_outside = len(outside_1_list) * 100 / len(values_list)
    if percentage_outside > 68:
        return 0
    else:
        return 1


def normal_dist_97_rule(values_list):
    elements = numpy.array(values_list)
    mean = numpy.mean(elements, axis=0)
    std = numpy.std(elements, axis=0)

    outside_2_list = [x for x in elements if (x > mean - 2 * std)]
    outside_2_list = [x for x in outside_2_list if (x < mean + 2 * std)]

    percentage_outside = len(outside_2_list) * 100 / len(values_list)
    if percentage_outside > 97:
        return 0
    else:
        return 1


def skew_normality(values_list):
    return scipy.stats.skewtest(values_list)


def kurtosis_normality(values_list):
    return scipy.stats.kurtosistest(values_list)


def strict_normality(values_list):
    return scipy.stats.normaltest(values_list)


def median(values_list):
    elements = numpy.array(values_list)
    q2 = numpy.quantile(elements, 0.5, axis=0)
    return q2


def box_quantiles(values_list):
    elements = numpy.array(values_list)
    q2 = numpy.quantile(elements, 0.5, axis=0)
    q1 = numpy.quantile(elements, 0.25, axis=0)
    q3 = numpy.quantile(elements, 0.75, axis=0)
    return [q1, q2, q3]


def outliers(values_list):
    q1, q2, q3 = box_quantiles(values_list)
    IQR = q3 - q1
    cut_off = IQR * 1.5
    lower_limit = q1 - cut_off
    upper_limit = q3 + cut_off
    outliers = [x for x in values_list if x < lower_limit or x > upper_limit]
    return outliers


###############################################################################
# check if the distribution is assymmetric
# -----------------INPUT--------------------
#   values_list := [x[var_name] for x in raw_data]
# -----------------OUTPUT--------------------
#   True if assymetric
###############################################################################

def is_asym(values_list):
    elements = numpy.array(values_list)
    q1 = numpy.quantile(elements, 1.0 / 3, axis=0)
    q3 = numpy.quantile(elements, 2.0 / 3, axis=0)
    avg = average(values_list)
    print([avg, q1, q3])
    return (avg < q1) or (avg > q3)


###############################################################################
# compute the likelihood of each data being a outlier UNDER THE ASSUMPTION
# that the data follows a Gaussian distribution
# -----------------INPUT--------------------
#   raw_data: raw data in the VegaLite spec
#   var_name: column of interest
#   values_list := [x[var_name] for x in raw_data]
# -----------------OUTPUT--------------------
#   each entry of raw_data is appended a "__ol" term indicating the likelihood
###############################################################################

def outlier_likelihood(values_list, raw_data, var_name):
    values_list = list(filter(None.__ne__, values_list))  # filter out "None" in the list
    c = sqrt(0.5)
    n = len(values_list)
    elements = numpy.array(values_list)
    mean = numpy.mean(elements, axis=0)
    std = numpy.std(elements, axis=0)
    ret = raw_data
    for i in range(len(ret)):
        if ret[i][var_name] is not None:
            ret[i]["__ol"] = 1 - n * (1 - abs(erf((ret[i][var_name] - mean) * c / std)))
        else:
            ret[i]["__ol"] = 0
    outliers_list = []
    for x in ret:
        if x["__ol"] >= 0.95:  # default threshold = 95%
            outliers_list.append(x[var_name])
    return [ret, outliers_list]


def missing_entries(values_list):
    missing = []
    missing_index = []
    n = 0
    for value in values_list:
        if value == "NA" or value == "null" or value == "N/A" or value is None or value == "NaN":
            missing_index.append(n)
            missing.append(value)
        n = n + 1
    return len(missing)


def duplicate_entries(raw_data):
    l = list()
    for dicto in raw_data:
        l.append(dicto[list(dicto.keys())[0]])
    s = set([x for x in l if l.count(x) <= 1])
    return min(1, len(raw_data) - len(s))


def is_US_zipcode(value):
    try:
        return zipcodes.is_real(value)
    except TypeError:
        return 0
    except ValueError:
        return 0
    except:
        return 0


def US_zipcode_validity(values_list):
    invalid_zipcodes = []
    invalic_zipcode_indices = []
    index = 0
    for value in values_list:
        if not is_US_zipcode(value):
            invalid_zipcodes.append(value)
            invalic_zipcode_indices.append(index)
        index = index + 1
    return invalid_zipcodes


def time_series(values_list):
    return 1


def time_series_check(values_list):
    values_list.sort()
    dates = pd.date_range(values_list[0], values_list[-1])
    df = pd.DataFrame(values_list, columns=['Date'])
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.set_index('Date')
    df = df.reindex(dates, fill_value=0.0)
    df = df.reset_index()
    df['day'] = df['index'].dt.dayofweek
    missing_days = df[(~df['day'])]

    if missing_days:
        return 1
    else:
        return 0


def validate_lat_long(lat, long):
    if lat < -90:
        return 1
    if lat > 90:
        return 1
    if long < -180:
        return 1
    if long > 180:
        return 1
    return 0


def apply_ttest(data, label, p):
    if len(data[label].unique()) == 2:
        a = data[data[label] == data[label].unique()[0]][["x", "y"]].to_numpy()
        b = data[data[label] == data[label].unique()[1]][["x", "y"]].to_numpy()
        if ttest_ind(a, b)[1].min() > p:
            return False
    return True


def check_significance(data, label, p=0.05):
    print(f"\t###### check_significance start ######")
    data = pd.DataFrame(data)
    significance = apply_ttest(data, label, p)
    suggestion = None
    if not significance:
        print(f"warning, no significance for label:{label}, searching for other labels")
        detected_labels = detect_labels(data, label)
        for detected_label in detected_labels:
            significance = apply_ttest(data, detected_label, p)
            if significance:
                print(f"found statistical significance for label:{detected_label}")
                suggestion = detected_label
                break
    print(f"\t###### check_significance end ######")
    return suggestion


def detect_labels(data, label, approx_samples_per_label=8):
    labels = []
    for column in data:
        if column == label:
            continue
        if len(data) / len(data[column].unique()) >= approx_samples_per_label:
            labels.append(column)
    return labels


def check_scale(data):
    data = pd.DataFrame(data)
    largest_scale = -np.inf
    smallest_scale = np.inf
    scale_suggestion = None
    for column in data:
        c_scale = data[column].max() - data[column].min()
        if c_scale > largest_scale:
            largest_scale = c_scale
            scale_suggestion = {"min": data[column].min(), "max": data[column].max()}
        if c_scale < smallest_scale:
            smallest_scale = c_scale
    if largest_scale / smallest_scale < 2.0:
        scale_suggestion = None
    return scale_suggestion
