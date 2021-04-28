const URL = "https://求人ボックス.com/adv/";
const KEYWORD = ["業務系エンジニア", "Webエンジニア"];
const AREA = {
  "kansai": ["大阪府", "京都府", "兵庫県"],
  "chubu": ["長野県", "岐阜県"],
  "hokkaido": ["北海道"],
};
// getパラメータの区切り文字 
// e.g. url?keyword=業務系エンジニア or: webエンジニア&大阪府 or:京都府 or:兵庫県
const GET_PARAM_DELIMITER = " or:";
let COLUMN_ORDER = ["compName", "job", "area", "pay", "updatedAt", "source"];
const ALLOW_EMPTY_COMPNAME = false; // 会社名が空の会社情報をシートに書き込むか

const SHEET_ID = "1QbMP9TDA7U81vctj0Dq_980fWESUWHHhqOhttEY6Zmc"; // sheet id to write scrapied info to 
const SHEET_NAME = "sheet1"; 
