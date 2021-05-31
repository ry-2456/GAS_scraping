// TODO: keyOrderに含まれているcolumnだけをsheetに書き込む
// TODO: 担当列を追加

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function(search, rawPos) {
      var pos = rawPos > 0 ? rawPos|0 : 0;
      return this.substring(pos, pos + search.length) === search;
    }
  });
}

function triggerFunction() {
  main(); 
}

function main() {

  // configシートがなければtemplateを作る
  if (!existsSheet(SHEET_ID, CONFIG_SHEET_NAME)) {
    makeTemplateConfigSheet(
      SHEET_ID, 
      CONFIG_SHEET_NAME, 
      CONFIG_TEMPLATE,
      [
        'spreadSheetIdToWriteTo', 
        'sheetNameToWriteTo', 
        'updatedAt',
        'columnToScrape',
        'header',
        'employType',
        'feature',
        'keyword',
        'area',
      ]
    );
  }

  var configObj = readConfigSpreadSheet(
    SHEET_ID,
    CONFIG_SHEET_NAME,
    CONFIG_PROP
  );
  configObj.area = toArray(configObj.area, 2);
  configObj.keyword = toArray(configObj.keyword, 1);

  // get ready for scraping and do scrape
  // make post params
  var payload = {
    "form[updatedAt]": configObj.updatedAt,
    "form[employType]": configObj.employType,
    "feature": configObj.feature
  };
  var options = {
    "method": "post",
    "payload": payload,
  };

  // 処理が途中で終わっていたなら続きから始める
  var properties = PropertiesService.getScriptProperties();
  var startPage = 0;
  var startAreaIndex = 0;
  if (properties.getProperty('inProgress') == 'true') {
    startPage      = parseInt(properties.getProperty('startPage')); 
    startAreaIndex = parseInt(properties.getProperty('startAreaIndex')); 
  }

  var compInfo = [];
  var startDate = new Date();
  for (var i = startAreaIndex; i < configObj.area.length; ++i) {
    for (var page = startPage; page <= 1; ++page) {
      console.log('i : ' + i + "   page : " + page);
      // 5分経過したら一旦終わる
      var nowDate = new Date();
      var elapsedMinutes = parseInt((nowDate.getTime() - startDate.getTime()) / (1000*60));
      console.log("elapsedMinutes: " + elapsedMinutes);
      if (elapsedMinutes >= 1) {
        properties.setProperty('startPage', page);    // 次回開始ページ番号
        properties.setProperty('startAreaIndex', i);  // 次回開始ページ
        properties.setProperty('inProgress', true);   // 処理の続きがあるかどうか

        // 途中結果を書き込む
        if (!ALLOW_EMPTY_COMPNAME) 
          compInfo = compInfo.filter(function(e) {
            return e.compName;
          });
        var twoDArrayCompInfo = objArrayTo2dArray(compInfo, COLUMN_ORDER);
        writeToSpreadSheet(COLUMN_ORDER, twoDArrayCompInfo, SHEET_ID, SHEET_NAME);
        
        deleteTriggers('triggerFunction');
        setTrigger(5, 'triggerFunction');
        return;
      }

      // add get params to url.
      var getParam = {};
      getParam.area = configObj.area[i];
      getParam.keyword = configObj.keyword;
      getParam.page = [String(page)];
      var url = addGetParamToUrl(URL, getParam, GET_PARAM_DELIMITER);

      // fetch html.
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() !== 200) break;
      var html = response.getContentText();

      // scrape
      var newCompInfo = scrape(html);
      if (!newCompInfo || !newCompInfo.length) break;
      Utilities.sleep(1500);  // sleep for 1.5s.
      compInfo = compInfo.concat(newCompInfo);
      
    }
  }
  if (!ALLOW_EMPTY_COMPNAME) 
    compInfo = compInfo.filter(function(e) {
      return e.compName;
    });

  var twoDArrayCompInfo = objArrayTo2dArray(compInfo, COLUMN_ORDER);
  writeToSpreadSheet(COLUMN_ORDER, twoDArrayCompInfo, SHEET_ID, SHEET_NAME);
  
  properties.setProperty('inProgress', false);   // 処理完了
  deleteTriggers('triggerFunction'); 
}

function scrape(html) {
  // regex patterns to extract info with
  // TODO: クラス名の正規表現をゆるくする(c-iconとか不必要なクラス名を消す)
  var sectionRegex = /<section class="p-result p-result-var1 is-biggerlink (s-placeSearch_parent|p-ad-item\d)">([\s\S]*?)<\/section>/g;
  var compNameRegex = /<p class="p-result_company">([\s\S]*?)<\/p>/;
  var jobRegex = /<span class="p-result_name">([\s\S]*?)<\/span>/;
  var areaRegex = /<li class="c-icon c-icon-result p-result_icon p-result_area">([\s\S]*?)<\/li>/;
  var payRegex = /<li class="c-icon c-icon-result p-result_icon p-result_pay">([\s\S]*?)<\/li>/;
  var updatedAtRegex = /<p class="p-result_updatedAt_hyphen">([\s\S]*?)<\/p>/;
  var sourceRegex = /<p class="p-result_source">([\s\S]*?)<\/p>/;

  var sections = html.match(sectionRegex);
  if (!sections) return;

  var compInfo = [];
  for (var i = 0; i < sections.length; ++i) {
    var obj = {};
    obj.compName  = getFirstCapturedGroupOrEmptyStr(sections[i], compNameRegex).trim()
    obj.job       = getFirstCapturedGroupOrEmptyStr(sections[i], jobRegex).trim()
    obj.area      = getFirstCapturedGroupOrEmptyStr(sections[i], areaRegex).trim()
    obj.pay       = getFirstCapturedGroupOrEmptyStr(sections[i], payRegex).trim()
    obj.updatedAt = getFirstCapturedGroupOrEmptyStr(sections[i], updatedAtRegex).trim()
    obj.source    = getFirstCapturedGroupOrEmptyStr(sections[i], sourceRegex).trim()
    compInfo.push(obj);
  }

  return compInfo;
}

function addGetParamToUrl(url, getParam, getParamDelimiter) {
  var getParamJoinedArr = [];
  Object.keys(getParam).forEach(function(key) {
    getParamJoinedArr.push(key + "=" + getParam[key].join(getParamDelimiter));
  });
  return url + '?' + getParamJoinedArr.join('&');
}

function writeLog(textToWrite, docId) {
  if (docId === undefined)
    docId = "1yccpzudmrlgYjOSoTDoqVJzWmmhS4VdA_YXVhAlOHkk"
  var logDoc = DocumentApp.openById(docId);
  logDoc.getBody().appendParagraph(textToWrite);
  logDoc.saveAndClose();
}

function writeToSpreadSheet(columnNames, twoDArray, sheetId, sheetName) {
  // if (compName not in spreadsheet) then 書き込む
  // TODO: セルに色をつけられるようにする
  // TODO: headerの有無を設定可能にする
  var spreadSheet = SpreadsheetApp.openById(sheetId); 
  var sheet = spreadSheet.getSheetByName(sheetName);
  
  // write columns to the first row. 
  var numColumns = columnNames.length;
  sheet.getRange(1, 1, 1, numColumns).setFontWeight("bold").setValues([columnNames]);

  // gets the number of rowss where cell in column A is not empty.
  var numRecords = sheet.getRange("A:A") // A列の範囲
                        .getValues()     // その範囲の値
                        .reduce(function(arrAcc, arrCur) { // 2dim => 1dim
                          return arrAcc.concat(arrCur);
                        }) 
                        .filter(function(e) { // count elem except empty one
                          return e.trim();
                        }).length; 
  
  // TODO: columnsのcompNameの位置を参照する
  // TODO: headerの有無を確認して取得範囲を決める
  var compNamesAlreadyExist = sheet.getRange('A2:A' + numRecords)
                                   .getValues()
                                   .reduce(function(arrAcc, arrCur) {
                                     return arrAcc.concat(arrCur);
                                   });

  var compInfoToSave = []; // 2darray
  for (var i = 0; i < twoDArray.length; ++i) {
    var compInfo = twoDArray[i];
    if (compNamesAlreadyExist.indexOf(compInfo[0]) === -1) {
      compInfoToSave.push(compInfo);
      compNamesAlreadyExist.push(compInfo[0]); // update compNamesAlreadyExist.
    }
  }

  // TODO: columnsの順番で書き込む
  if (!compInfoToSave.length) return; // no new company info are scraped.
  var numRows = compInfoToSave.length
  var rangeToWrite = sheet.getRange(numRecords+1, 1, numRows, numColumns);
  rangeToWrite.setValues(compInfoToSave);
}

function toArray(val, dim) {
  // convert val to array or 2darray.
  // dimension reduction is not possible. eg. [[val]] -> [val] is not possible.
  var oneDArr = Array.isArray(val) ? val : [val];
  var twoDArr = Array.isArray(oneDArr[0]) ? oneDArr : [oneDArr];
  if (dim === 1) return oneDArr;
  if (dim === 2) return twoDArr;
}

function getFirstCapturedGroupOrEmptyStr(sourceStr, regexPattern) {
  var matchArray = sourceStr.match(regexPattern);
  return (matchArray ? matchArray[1] : "");
}

function objArrayTo2dArray(objArray, keyOrder) {
  // [obj1, obj2, obj3, ...] => [[val1_1, val1_2, ...], [val2_1, val2_2, val2_3,...], [val3_1,...]]
  var twoDArray = [];
  for (var i = 0; i < objArray.length; ++i)
    twoDArray.push(keyOrder.map(function(key) {
      return objArray[i][key];
    }));
  return twoDArray;
}

function readConfigSpreadSheet(sheetId, sheetName, propArr) {
  // return configObj which has scraping config info.
  // read config sheet.as 2d array.
  var spreadSheet = SpreadsheetApp.openById(sheetId); 
  var sheet = spreadSheet.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var configArr = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  // devare comment string(cell) and comment rows.
  for (var i = 0; i < configArr.length; ++i)
    configArr[i] = configArr[i]
                    .map(String)
                    .filter(function(e) {
                      return !e.trim().startsWith(COMMENT_PREFIX);
                    })
                    .filter(function(e) {
                      return e.trim().length;
                    })
  configArr = configArr.filter(function(arr) {
    return arr.length;
  });

  // make config obj from configArr
  // make [prop] in propArr into prop.
  // eg. [area] -> area
  configArr = configArr.map(function(arr) {
    if (arr.length === 1 && (propArr.indexOf(arr[0]) !== -1))
      return arr[0];
    return arr;
  });

  // make config obj where prop is key and values other than prop are values.
  // note values are all 1-dim array or 2-dim array.
  // 1-dim array has no values, and 2-dim array has one or more values.
  configObj = {};
  var currentProp;
  configArr.forEach(function(elem) {
    if (propArr.indexOf(elem) !== -1) {
      currentProp = elem;
      configObj[currentProp] = [];
      return;
    }
    configObj[currentProp].push(elem);
  });

  // to handle configObj easily convert values as follows
  Object.keys(configObj).forEach(function(prop) {
    if (configObj[prop].length === 0) {
      configObj[prop] = '';                   // []          -> ''
    } 
    else if (configObj[prop].length === 1) { 
      configObj[prop] = configObj[prop][0];   // [[val,...]] -> [val,...]
      if (configObj[prop].length === 1) {    
        configObj[prop] = configObj[prop][0]; // [val]       -> val
      }
    }
  });

  return configObj;
}

function existsSheet(sheetId, sheetName) {
  var spreadSheet = SpreadsheetApp.openById(sheetId); 
  var sheet = spreadSheet.getSheetByName(sheetName);
  if (sheet) return true;
  return false;
}

function makeTemplateConfigSheet(sheetId, sheetName, configTemplate, coloredCell) {
  // configのtemplateを作る
  // TODO: updatedAt, employTypeをプルダウンメニューにする
  var spreadSheet = SpreadsheetApp.openById(sheetId); 
  var sheet = spreadSheet.insertSheet();
  sheet.setName(sheetName);

  for (var i = 0; i < configTemplate.length; ++i) {
    for (var j = 0; j < configTemplate[i].length; ++j) {
      console.log("i : j = " + i + " : " + j);
      cell = sheet.getRange(i+1, j+1);
      cell.setValue(configTemplate[i][j]);
      // 左端でcoloredCellに含まれるcellに色を付ける
      if (coloredCell.indexOf(configTemplate[i][j]) !== -1 && j == 0)
        cell.setBackground('#00ff00');
    }
  }
  return sheet;
}

function setTrigger(minutesAfter, funcName) {
  // minutesAfter分後にfuncNameを実行するトリガーを作る
  var nowDate = new Date();
  nowDate.setMinutes(nowDate.getMinutes() + minutesAfter); 
  ScriptApp.newTrigger(funcName).timeBased().at(nowDate).create();
}

function deleteTriggers(funcName) {
  // funcNameのトリガーをすべて削除
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; ++i )
    if (allTriggers[i].getHandlerFunction() == funcName)
      ScriptApp.deleteTrigger(allTriggers[i]);
}
