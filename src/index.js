import {Deck,OrthographicView}  from '@deck.gl/core';
import {ScatterplotLayer, LineLayer, PathLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json'
import {TileLayer} from '@deck.gl/geo-layers';
import {load} from '@loaders.gl/core';
//const {JSONLoader, load} = json; 

import ionRangeSlider from 'ion-rangeslider';


{
  const originalDate = new Date("2006-01-01");
  const x = 366; // 예를 들어 365일을 더하고자 할 때
  
  originalDate.setDate(originalDate.getDate() + x);
  
  console.log(originalDate);

  const year = originalDate.getFullYear();
  const month = originalDate.getMonth();
  console.log(year, month);
  const yearMonthNum = (year-2006) * 12 + month;

}


let currentZoom = 7;

let rankMin = 0.0;
let rankMax = 0.1;
let groupMax = 0;
let groupAvgPath = new Array();

const deckgl = new Deck({
  parent: document.getElementById('container'),
  views: new OrthographicView(),
  initialViewState: {
    target : [1,20,0],
    zoom: -2,    
    minZoom : -10
  },
  controller: true,
  //{doubleClickZoom: false, touchRotate: true},
  getTooltip: ({object}) => object && {
    html: `<h3>${object.date}</h3><h3>${object.avgTmp}도</h3>`,
    style: {
      backgroundColor: '#000000aa',
      fontSize: '0.8em',
      color : '#ffffff'
    }
  },
 
 

});



function loadBinaryDataFromFile(fileName) {
  return new Promise(async (resolve, reject) => {
      try {
          let response = await fetch(fileName);

          if (!response.ok) {
              reject(new Error(`HTTP error! Status: ${response.status}`));
              return;
          }

          let arrayBuffer = await response.arrayBuffer();
          resolve(new Uint8Array(arrayBuffer));
      } catch (error) {
          reject(error);
      }
  });
}

let dataTrans = new Array();
let dataGroup = new Map();

const fileDate = "./data/3040date.bin";
const filePrice = "./data/3040price.bin";

Promise.all([loadBinaryDataFromFile(fileDate), loadBinaryDataFromFile(filePrice)])
  .then(results => {
      const dataDate = results[0];
      const dataPrice = results[1];

      // 두 결과를 종합
      const st = new Date();
      dataTrans = new Array(dataDate.length/2);
      for(let i = 0; i < dataDate.length; i+=2) {
          
        const date = dataDate[i] * 256 + dataDate[i+1];
        const price = (dataPrice[i] * 256 + dataPrice[i+1]) * 100;

        const monthGroup = getYearMonthNum(date);
        // dataTrans[i/2] = {
        //   date : date,
        //   price : price,
          
        // }

        if (!dataGroup.has(monthGroup)) {
          dataGroup.set(monthGroup, new Array());
        }
        dataGroup.get(monthGroup).push({
          date : date,
          price : price,
          monthGroup : monthGroup,
          pos : [date*xMul,price*yMul],
          rank : 0
        });

      }
      
      let idx = 0;
      for (let [group, valueArr] of dataGroup) {

        //그룹 최대값 구하기
        if (groupMax<group) groupMax = group;

        // 1. 한 그룹 안에서 price 값을 기준으로 내림차순 정렬한다.
        valueArr.sort((a, b) => b.price - a.price);
        
        // 2. rank를 부여한다.
        for (let i = 0; i < valueArr.length; i++) {
            valueArr[i].rank = i + 1;
        }

        // 3. rankR 값을 부여한다.
        let maxRank = valueArr.length;
        for (let i = 0; i < valueArr.length; i++) {
            // 1위는 1.0, 마지막 순위는 0.0 이므로
            valueArr[i].rankR = (maxRank - valueArr[i].rank) / (maxRank - 1);
            dataTrans[idx] = valueArr[i];
            idx++;
        }
      }

  
      console.log(dataTrans);
      console.log(dataGroup);
      const et = new Date();
      console.log("runtime :", et-st, "ms");
      makeAvgPath();      
      mainloop();
  })
  .catch(error => {
      console.error("Error in loading binary data:", error);
  });


const date20060101 = new Date("2006-01-01");
function addDaysToDate(daysToAdd) {
  // dateString 형식: 'YYYY-MM-DD'
  
  const newDate = new Date("2006-01-01");
  newDate.setDate(newDate.getDate() + daysToAdd);

  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, '0');  // 0부터 시작하는 월 값을 가져와서 1을 더함
  const day = String(newDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getYearMonthNum(dateNum) {
  // dateString 형식: 'YYYY-MM-DD'
  
  const newDate = new Date("2006-01-01");
  newDate.setDate(newDate.getDate() + dateNum);

  const year = newDate.getFullYear();
  const month = newDate.getMonth();
  //console.log(year, month);
  const yearMonthNum = (year-2006) * 12 + month;
  return yearMonthNum
}


function monthGroupToDate(monthGroup) {
  const year = (monthGroup/12) + 2006;
  const month = monthGroup%12;
  let date = new Date(year, month, 15);
  return Math.floor((date-date20060101) / (1000 * 60 * 60 * 24));
}
//console.log("addDaysToDate(5)", addDaysToDate(5));



const xMul = 100;
const yMul = -1;



function mainloop() {


  const layers =  [

    

    new ScatterplotLayer({
      id: 'prices',
      data: dataTrans,
      
      // Styles
      filled: true,

      radiusMinPixels: 0,
      radiusScale: 1,
      getPosition: d => d.pos,
      getRadius: 2,
      radiusUnits: 'pixels',
      getFillColor:  d => [0,0,0, 40],
      // Interactive props
      //pickable: true,
      //autoHighlight: true,
      //onHover: ({object}) => object && console.log(`일 최고기온 : ${object.avgTmp}`),

      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : []
       
      },
      
      //visible : visible02,
      getFilterValue: d => [d.rankR],
      filterRange: [[rankMin, rankMax]],
      extensions: [new DataFilterExtension({filterSize: 1})]    
    }),

    // new TextLayer({
    //   id: 'text',
    //   data:  tempData,
    //   getText: d=> ""+d.avgTmp,
    //   getPosition: d=> [d.day*xMul,(d.avgTmp+0.1)*yMul],
    //   getSize: 15,
    //   radiusUnits: 'pixels',
    //   getColor: [255, 0, 0, 255],
    //   //sizeUnits: 'pixels',
    //   //sizeMaxPixels: 64,
    //   visible : true,
    //   getAngle: 0,
    //   fontFamily: 'Malgun Gothic',
    //   getTextAnchor: 'middle',
    //   getAlignmentBaseline: 'center',
    //   getFilterValue: d => [d.year],
    //   filterRange: [[year, year]],
    //   sizeScale: 1,
    //   extensions: [new DataFilterExtension({filterSize: 1})] 
    //   // updateTriggers: {
    //   //   // This tells deck.gl to recalculate radius when `currentYear` changes
    //   //   getText : [year]
       
    //   // },
    // }),
    new PathLayer({
      id: 'line-layer',
      data : groupAvgPath,
      //pickable: true,
      getWidth: 4,
      widthScale: 1,
      widthMinPixels: 2,
      getPath: d => d.path,
      getColor: [255,0,0,255],

    }),

    // new PathLayer({
    //   id: 'line-layer2',
    //   data : avgPath1916,
    //   //pickable: true,
    //   getWidth: 3,
    //   widthScale: 1,
    //   widthMinPixels: 2,
    //   getPath: d => d.path,
    //   getColor: [50,75,255,100],

    // }),

    // new TextLayer({
    //   id: 'text',
    //   data:  textData,
    //   getText: d=> d.text,
    //   getPosition: d=> [d.x*xMul,d.y*yMul],
    //   getSize: d=>d.size,
    //   sizeUnits : 'meters',
    //   getColor: d=>d.color,
    //   //sizeUnits: 'pixels',
    //   //sizeMaxPixels: 64,
    //   visible : true,
    //   getAngle: d=>d.angle,
    //   fontFamily: 'NotoSerifKR',
    //   getTextAnchor: 'middle',
    //   getAlignmentBaseline: 'center',

    //   // updateTriggers: {
    //   //   // This tells deck.gl to recalculate radius when `currentYear` changes
    //   //   getText : [year]
       
    //   // },
    // }),
    // new LineLayer({
    //   id: 'line-layer',
    //   data : ind,
    //   //pickable: true,
    //   getWidth: 1,
    //   getSourcePosition: d => d.from,
    //   getTargetPosition: d => d.to,
    //   getColor: d => d.color
    // })
  ];
  

  deckgl.setProps({layers});
};

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener("keydown", (e) => {
  if (e.key=='+') {
    rankMin += 0.1;
    rankMax += 0.1;
    if (rankMax>=1.0) {
      rankMin = 0.9;
      rankMax = 1.0;
    }
  }
  if (e.key=='-') {
    rankMin -= 0.1;
    rankMax -= 0.1;
    if (rankMin<=0.0) {
      rankMin = 0.0;
      rankMax = 0.1;
    }
  }
  makeAvgPath();      
  mainloop();
});

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

function makeAvgPath() {

  const avgPath = new Array(groupMax+1);
  for (let [group, valueArr] of dataGroup) {

    let sum = 0;
    let cnt = 0;
    // 2. rank를 부여한다.
    for (let i = 0; i < valueArr.length; i++) {
      if (valueArr[i].rankR>rankMax) continue;
      if (valueArr[i].rankR<rankMin) break;
      sum += valueArr[i].price;
      cnt++;
    }
    const avg = sum / cnt;
    avgPath[group] = {
      monthGroup : group,
      date : monthGroupToDate(group),
      avgPrice : avg,      
    }
  }
  console.log("avgPath", avgPath);
  const pathArr = new Array();
  for (const d of avgPath) {
    pathArr.push([d.date * xMul, d.avgPrice * yMul]);
  }
  groupAvgPath = new Array();
  groupAvgPath.push({
    path : pathArr
  });
}




//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

const doc = document.getElementById("staticItems");
const cl0 = 'h1';
const tx =  
`아파트 매매 실거래가`;
drawTitle(tx, 1);

function drawTitle(text, tagLevel) {
  
  let plines = '<h'+tagLevel+'>'+ text+'</h'+tagLevel+'>';  
  const div = document.createElement('div');
  div.innerHTML = plines;
  div.className = 'title'+tagLevel;
  doc.appendChild(div);
}


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////