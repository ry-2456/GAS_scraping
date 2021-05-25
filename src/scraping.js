// TODO: configをスプレッドシートに移行
// TODO: keyOrderに含まれているcolumnだけをsheetに書き込む
// TODO: 担当列を追加
function main() {
  let compInfo = scrape();
  if (!ALLOW_EMPTY_COMPNAME) compInfo = compInfo.filter(e => e.compName);
  let twoDArrayCompInfo = objArrayTo2dArray(compInfo, COLUMN_ORDER);
  writeToSpreadSheet(COLUMN_ORDER, twoDArrayCompInfo, SHEET_ID, SHEET_NAME);
}

function scrape(html) {
  // regex patterns to extract info with
  // TODO: クラス名の正規表現をゆるくする(c-iconとか不必要なクラス名を消す)
  const sectionRegex = /<section class="p-result p-result-var1 is-biggerlink (s-placeSearch_parent|p-ad-item\d)">([\s\S]*?)<\/section>/g;
  const compNameRegex = /<p class="p-result_company">([\s\S]*?)<\/p>/;
  const jobRegex = /<span class="p-result_name">([\s\S]*?)<\/span>/;
  const areaRegex = /<li class="c-icon c-icon-result p-result_icon p-result_area">([\s\S]*?)<\/li>/;
  const payRegex = /<li class="c-icon c-icon-result p-result_icon p-result_pay">([\s\S]*?)<\/li>/;
  const updatedAtRegex = /<p class="p-result_updatedAt_hyphen">([\s\S]*?)<\/p>/;
  const sourceRegex = /<p class="p-result_source">([\s\S]*?)<\/p>/;

  let sections = html.match(sectionRegex);
  if (!sections) return;

  let compInfo = [];
  for (let i = 0; i < sections.length; ++i) {
    let obj = {};
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
  let getParamJoinedArr = [];
  for (const prop in getParam)
    getParamJoinedArr.push(prop + "=" + getParam[prop].join(getParamDelimiter));
  return url + '?' + getParamJoinedArr.join('&');
}

function writeLog(textToWrite, docId="1yccpzudmrlgYjOSoTDoqVJzWmmhS4VdA_YXVhAlOHkk") {
  let logDoc = DocumentApp.openById(docId);
  logDoc.getBody().appendParagraph(textToWrite);
  logDoc.saveAndClose();
}

function writeToSpreadSheet(columnNames, twoDArray, sheetId, sheetName) {
  // if (compName not in spreadsheet) then 書き込む
  // TODO: セルに色をつけられるようにする
  // TODO: headerの有無を設定可能にする
  let spreadSheet = SpreadsheetApp.openById(sheetId); 
  let sheet = spreadSheet.getSheetByName(sheetName);
  
  // write columns to the first row. 
  let numColumns = columnNames.length;
  sheet.getRange(1, 1, 1, numColumns).setFontWeight("bold").setValues([columnNames]);

  // gets the number of rowss where cell in column A is not empty.
  let numRecords = sheet.getRange("A:A")                                       // A列の範囲
                      .getValues()                                           // その範囲の値
                      .reduce((arrAcc, arrCur) => arrAcc.concat(arrCur)) // 2dim => 1dim
                      .filter(elem => elem.trim()).length;                   // count elem except empty one
  console.log("numRecords : " + String(numRecords));
  
  // TODO: columnsのcompNameの位置を参照する
  // TODO: headerの有無を確認して取得範囲を決める
  let compNamesAlreadyExist = sheet.getRange(`A2:A${numRecords}`)
                                   .getValues()
                                   .reduce((arrAcc, arrCur) => arrAcc.concat(arrCur));

  // TODO: 同じ会社名で地域や職種が異なる場合の処理をどうするか考える
  let compInfoToSave = []; // 2darray
  for (let compInfo of twoDArray) {
    if (!compNamesAlreadyExist.includes(compInfo[0])) {
      compInfoToSave.push(compInfo);
      compNamesAlreadyExist.push(compInfo[0]); // update compNamesAlreadyExist.
    }
  }

  // TODO: columnsの順番で書き込む
  if (!compInfoToSave.length) return; // no new company info are scraped.
  let numRows = compInfoToSave.length
  let rangeToWrite = sheet.getRange(numRecords+1, 1, numRows, numColumns);
  rangeToWrite.setValues(compInfoToSave);
}

function toArray(val, dim) {
  // convert val to array or 2darray.
  // dimension reduction is not possible. eg. [[val]] -> [val] is not possible.
  let oneDArr = Array.isArray(val) ? val : [val];
  let twoDArr = Array.isArray(oneDArr[0]) ? oneDArr : [oneDArr];
  if (dim === 1) return oneDArr;
  if (dim === 2) return twoDArr;
}

function getFirstCapturedGroupOrEmptyStr(sourceStr, regexPattern) {
  let matchArray = sourceStr.match(regexPattern);
  return (matchArray ? matchArray[1] : "");
}

function objArrayTo2dArray(objArray, keyOrder) {
  // [obj1, obj2, obj3, ...] => [[val1_1, val1_2, ...], [val2_1, val2_2, val2_3,...], [val3_1,...]]
  let twoDArray = [];
  for (let i = 0; i < objArray.length; ++i)
    twoDArray.push(keyOrder.map(key => objArray[i][key]));
  return twoDArray;
}

function readConfigSpreadSheet(sheetId, sheetName, propArr) {
  // return configObj which has scraping config info.
  // read config sheet.as 2d array.
  let spreadSheet = SpreadsheetApp.openById(sheetId); 
  let sheet = spreadSheet.getSheetByName(sheetName);
  let lastRow = sheet.getLastRow();
  let lastColumn = sheet.getLastColumn();
  let configArr = sheet.getRange(1, 1, lastRow, lastColumn).getValues();

  // delete comment string(cell) and comment rows.
  for (let i = 0; i < configArr.length; ++i)
    configArr[i] = configArr[i]
                    .map(String)
                    .filter(e => !e.trim().startsWith(COMMENT_PREFIX))
                    .filter(e => e.trim().length);
  configArr = configArr.filter(arr => arr.length);

  // make config obj from configArr
  // make [prop] in propArr into prop.
  // eg. [area] -> area
  configArr = configArr.map(arr => {
    if (arr.length === 1 && propArr.includes(arr[0]))
      return arr[0];
    return arr;
  });

  // make config obj where prop is key and values other than prop are values.
  // note values are all 1-dim array or 2-dim array.
  // 1-dim array has no values, and 2-dim array has one or more values.
  configObj = {};
  let currentProp;
  for (const elem of configArr) {
    if (propArr.includes(elem)) {
      currentProp = elem;
      configObj[currentProp] = [];
      continue;
    }
    configObj[currentProp].push(elem);
  }
 
  // to handle configObj easily convert values as follows
  for (const prop in configObj) {
    if (configObj[prop].length === 0) {
      configObj[prop] = '';                   // []          -> ''
    } 
    else if (configObj[prop].length === 1) { 
      configObj[prop] = configObj[prop][0];   // [[val,...]] -> [val,...]
      if (configObj[prop].length === 1) {    
        configObj[prop] = configObj[prop][0]; // [val]       -> val
      }
    }
  }

  return configObj;
}

function existsSheet(sheetId, sheetName) {
  let spreadSheet = SpreadsheetApp.openById(sheetId); 
  let sheet = spreadSheet.getSheetByName(sheetName);
  if (sheet) return true;
  return false;
}

function makeTemplateConfigSheet(sheetId, sheetName, configTemplate, coloredCell) {
  // configのtemplateを作る
  // TODO: updatedAt, employTypeをプルダウンメニューにする
  let spreadSheet = SpreadsheetApp.openById(sheetId); 
  let sheet = spreadSheet.insertSheet();
  sheet.setName(sheetName);

  for (let i = 0; i < configTemplate.length; ++i) {
    for (let j = 0; j < configTemplate[i].length; ++j) {
      cell = sheet.getRange(i+1, j+1);
      cell.setValue(configTemplate[i][j]);
      // 左端でcoloredCellに含まれるcellに色を付ける
      if (coloredCell.includes(configTemplate[i][j]) && j == 0)
        cell.setBackground('#00ff00');
    }
  }
  return sheet;
}

function setTrigger(minutesAfter, funcName) {
  // minutesAfter分後にfuncNameを実行するトリガーを作る
  let nowDate = new Date();
  nowDate.setMinutes(nowDate.getMinutes() + minutesAfter); 
  ScriptApp.newTrigger(funcName).timeBased().at(nowDate).create();
}

function deleteTriggers(funcName) {
  // funcNameのトリガーをすべて削除
  let allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; ++i )
    if (allTriggers[i].getHandlerFunction() == funcName)
      ScriptApp.deleteTrigger(allTriggers[i]);
}
