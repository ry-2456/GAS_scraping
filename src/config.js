const URL = "https://求人ボックス.com/adv/";
// getパラメータの区切り文字 
// e.g. url?keyword=業務系エンジニア or: webエンジニア&大阪府 or:京都府 or:兵庫県
const GET_PARAM_DELIMITER = " or:";
let COLUMN_ORDER = ["compName", "job", "area", "pay", "updatedAt", "source"];
const ALLOW_EMPTY_COMPNAME = false; // 会社名が空の会社情報をシートに書き込むか

const SHEET_ID = "1QbMP9TDA7U81vctj0Dq_980fWESUWHHhqOhttEY6Zmc"; // sheet id to write scrapied info to 
const SHEET_NAME = "sheet1"; 

// readConfigSpreadSheetで読み込むコンフィグのprop
const CONFIG_PROP = [ 
  "area", 
  "keyword", 
  "spreadSheetIdToWriteTo", 
  "sheetNameToWriteTo",
  "updatedAt", 
  "columnToScrape", 
  "header", 
  "employType", 
  "feature" 
];
const COMMENT_PREFIX = "#"; // configスプレッドシートのコメントセル接頭辞

const CONFIG_SHEET_NAME = 'config';

const CONFIG_TEMPLATE = [
  ['#(number sing)で始まるセルとはコメント'],
  ['spreadSheetIdToWriteTo'],
  ['your spread sheet id'],
  ['sheetNameToWriteTo'],
  ['scraped_info'],
  ['updatedAt'],
  ['', '#何も書かない(指定なし)\n1(24時間以内)\n2(3日以内)\n3(7日以内)'],
  ['columnToScrape'],
  ['compName', 'job', 'area', 'pay', 'updatedAt', 'source'],
  ['header'],
  ['compName', 'job', 'area', 'pay', 'updatedAt', 'source', 'in_charge'],
  ['employType'],
  ['', '#何も書かない(すべて)\n1(正社員)\n2(アルバイト・パート)\n5(派遣社員)'],
  ['feature'],
  ['', '#何も書かない(指定なし)\n1(未経験OK)'],
  ['keyword'],
  ['webエンジニア'],
  ['area', '#正式名称で書く必要あり'],
  ['東京都', '神奈川県'],
  ['大阪府', '京都府', '兵庫県'],
  ['北海道'],
  ['愛知県', '三重県'],
];
