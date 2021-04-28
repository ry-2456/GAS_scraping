// TODO: configをスプレッドシートに移行
// TODO: keyOrderに含まれているcolumnだけをsheetに書き込む
// TODO: 担当列を追加
function main() {
  let compInfo = scrape();
  if (!ALLOW_EMPTY_COMPNAME) compInfo = compInfo.filter(e => e.compName);
  let twoDArrayCompInfo = objArrayTo2dArray(compInfo, COLUMN_ORDER);
  writeToSpreadSheet(COLUMN_ORDER, twoDArrayCompInfo, SHEET_ID, SHEET_NAME);
}

function scrape() {
  // regex pattern to extract info
  // TODO: クラス名の正規表現をゆるくする(c-iconとか不必要なクラス名を消す)
  const sectionRegex = /<section class="p-result p-result-var1 is-biggerlink (s-placeSearch_parent|p-ad-item\d)">([\s\S]*?)<\/section>/g;
  const compNameRegex = /<p class="p-result_company">([\s\S]*?)<\/p>/;
  const jobRegex = /<span class="p-result_name">([\s\S]*?)<\/span>/;
  const areaRegex = /<li class="c-icon c-icon-result p-result_icon p-result_area">([\s\S]*?)<\/li>/;
  const payRegex = /<li class="c-icon c-icon-result p-result_icon p-result_pay">([\s\S]*?)<\/li>/;
  const updatedAtRegex = /<p class="p-result_updatedAt_hyphen">([\s\S]*?)<\/p>/;
  const sourceRegex = /<p class="p-result_source">([\s\S]*?)<\/p>/;

  let compInfo = [];
  for (let page = 0; page <= 2; ++page) {
    // GETパラメーター
    let getParam = {};
    getParam.area = AREA["kansai"];
    getParam.keyword = KEYWORD;
    getParam.page = [String(page)];
    let url = addGetParam(URL, getParam, GET_PARAM_DELIMITER);

    // POSTパラメータ
    let payload = {
      "form[updatedAt]": '1',  // 24時間以内
      "form[employType]": '1', // 正社員
      "feature": '1',
    };
    let options = {
      "method": "post",
      "payload": payload,
    };

    // htmlの取得
    let response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) return compInfo;
    let html = response.getContentText();
    
    // do scraping
    let sections = html.match(sectionRegex);
    if (!sections) return compInfo; // no company info in this html

    for (let i = 0; i < sections.length; ++i) {
      let obj = {};
      let compName = sections[i].match(compNameRegex);
      obj.compName = (compName ? compName[1].trim() : "");

      let job = sections[i].match(jobRegex);
      obj.job = (job ? job[1].trim() : "");

      let area = sections[i].match(areaRegex);
      obj.area = (area ? area[1].trim() : "");

      let pay = sections[i].match(payRegex);
      obj.pay = (pay ? pay[1].trim() : "");

      let updatedAt = sections[i].match(updatedAtRegex);
      obj.updatedAt = (updatedAt ? updatedAt[1].trim() : "");

      let source = sections[i].match(sourceRegex);
      obj.source = (source ? source[1].trim() : "");

      compInfo.push(obj);
      console.log(obj);
    }
    Utilities.sleep(1500); // sleep for 1.5sec
    // console.log(compInfo.length);
  } 
  console.log(compInfo.length);
  return compInfo;
}

function addGetParam(url, getParam, getParamDelimiter) {
  // urlにparamを付け足したurlを返す
  let getParamList = [];
  for (key in getParam)
    getParamList.push(key + "=" + getParam[key].join(getParamDelimiter));
  return url + '?' + getParamList.join('&');
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
  let n_column = columnNames.length;
  sheet.getRange(1, 1, 1, n_column).setFontWeight("bold").setValues([columnNames]);

  // gets the number of rowss where cell in column A is not empty.
  let n_record = sheet.getRange("A:A")                                       // A列の範囲
                      .getValues()                                           // その範囲の値
                      .reduce((arr_acc, arr_cur) => arr_acc.concat(arr_cur)) // 2dim => 1dim
                      .filter(elem => elem.trim()).length;                   // count elem except empty one
  console.log("n_record : " + String(n_record));
  
  // TODO: columnsのcompNameの位置を参照する
  // TODO: headerの有無を確認して取得範囲を決める
  let compNamesAlreadyExist = sheet.getRange(`A2:A${n_record}`)
                                   .getValues()
                                   .reduce((arr_acc, arr_cur) => arr_acc.concat(arr_cur));
  console.log(compNamesAlreadyExist);

  let compInfoToWrite = []; // 2darray
  for (let compInfo of twoDArray) {
    if (!compNamesAlreadyExist.includes(compInfo.compName)) {
      compInfoToWrite.push(compInfo);
      compNamesAlreadyExist.push(compInfo.compName); // update compNamesAlreadyExist.
    }
  }

  // TODO: columnsの順番で書き込む
  let n_row = compInfoToWrite.length
  let n_col = compInfoToWrite[0].length;
  let rangeToWrite = sheet.getRange(n_record+1, 1, n_row, n_col);
  rangeToWrite.setValues(compInfoToWrite);
}

function objArrayTo2dArray(objArray, keyOrder) {
  // [obj1, obj2, obj3, ...] => [[val1_1, val1_2, ...], [val2_1, val2_2, val2_3,...], [val3_1,...]]
  let twoDArray = [];
  for (let i = 0; i < objArray.length; ++i)
    twoDArray.push(keyOrder.map(key => objArray[i][key]));
  return twoDArray;
}

