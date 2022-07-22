// The purpose of the project is to extract information of worlcup from cricinfo and present
// that in the form of excel and pdf scorecards
// The real purpose is to learn how to extract information and get experience with JavaScript
// A very good reason to make a project is to have good fun

// npm init -y
// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib


// node Project.js --excel=worldcup.xls --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let args = minimist(process.argv);
let path = require("path");

// download using axios
// read using jsdom
// make excel using excel4node
// make pdf using pdf-lib

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function(response)
{
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");
    // console.log(matchScoreDivs.length);
    for(let i=0;i<matchScoreDivs.length;i++)
    {
        let match = {
            //
        };

        let namePs = matchScoreDivs[i].querySelectorAll("p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;

        let scoreSpans = matchScoreDivs[i].querySelectorAll("span.score");  //due to Rain if one team batting didn't come
        if(scoreSpans.length == 2)
        {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent;
        }
        else if(scoreSpans.length == 1)
        {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        }
        else
        {
            match.t1s = "";
            match.t2s = "";
        }
        let spanResult = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;
        matches.push(match);
    }

    let macthesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",macthesJSON,"utf-8");
    //Hame Match ka array mil gya but we now want teams ka array chaiye India ka alag pura object ho; 
    let teams = [];
    for(let i=0;i<matches.length;i++)
    {
        populateTeams(teams,matches[i]);
    }
    // console.log(teams);
    for(let i=0;i<matches.length;i++)
    {
        putMatchinTeamsArray(teams,matches[i]);
    }
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsJSON,"utf-8");

    createExcelFile(teams);
    createFolders(teams);

}).catch(function(err)
{
    console.log(err);
});

function populateTeams(teams,match)
{
    let t1idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }
    if(t1idx == -1)
    {
        let team = {
            name : match.t1,
            matches : []
        }
        teams.push(team);
    }

    let t2idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    if(t2idx == -1)
    {
        let team = {
            name : match.t2,
            matches : []
        }
        teams.push(team);
    }
}

function putMatchinTeamsArray(teams,match)
{
    let t1idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t1){
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs : match.t2,
        selfScore : match.t1s,
        opponentScore : match.t2s,
        result : match.result
    });

    let t2idx = -1;
    for(let i=0;i<teams.length;i++)
    {
        if(teams[i].name == match.t2){
            t2idx = i;
            break;
        }
    }
    let team = teams[t2idx];
    team.matches.push({
        vs :  match.t1,
        selfScore : match.t2s,
        opponentScore : match.t1s,
        result : match.result
    });
}

function createExcelFile(teams)
{
    let wb = new excel.Workbook();
    for(let i=0;i<teams.length;i++)
    {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("SelfScore");
        sheet.cell(1, 3).string("OpponentScore");
        sheet.cell(1, 4).string("Result");

        for(let j=0;j<teams[i].matches.length;j++)
        {
            sheet.cell(j + 3, 1).string(teams[i].matches[j].vs);
            sheet.cell(j + 3, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(j + 3, 3).string(teams[i].matches[j].opponentScore);
            sheet.cell(j + 3, 4).string(teams[i].matches[j].result);
        }
    } 
    wb.write(args.excel);
}

function createFolders(teams){

    fs.mkdirSync(args.dataFolder);
    for(let i=0;i<teams.length;i++)
    {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);
        for(let j=0;j<teams[i].matches.length;j++)
        {
            let matchFileName = path.join(teamFN, teams[i].matches[j].vs + ".pdf");
            createScoreCard(teams[i].name , teams[i].matches[j],matchFileName);
        }
    }
}

function createScoreCard(teamName , match , matchFileName)
{
    //here we will use pdf-lib to create pdf
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.opponentScore;
    let result = match.result;

    let originalBytes = fs.readFileSync("Template.pdf");
    let promiseToLoadBytes = pdf.PDFDocument.load(originalBytes);
    promiseToLoadBytes.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
        page.drawText(t1,{
            x:300,
            y:695,
            size :10
        });
        page.drawText(t2,{
            x:300,
            y:705,
            size :10
        });
        page.drawText(t1s,{
            x:300,
            y:715,
            size :10
        });
        page.drawText(t2s,{
            x:300,
            y:725,
            size :10
        });
        page.drawText(result,{
            x:300,
            y:735,
            size :10
        });
        let promiseToSave = pdfdoc.save();
        promiseToSave.then(function(changedBytes){
            fs.writeFileSync(matchFileName,changedBytes);
        });
    });
}