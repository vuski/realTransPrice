import {Deck,OrthographicView}  from '@deck.gl/core';
import {ScatterplotLayer, LineLayer, PathLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json'
import {TileLayer} from '@deck.gl/geo-layers';
import {load} from '@loaders.gl/core';
import GL from '@luma.gl/constants';
//const {JSONLoader, load} = json; 

import ionRangeSlider from 'ion-rangeslider';

TextLayer.fontAtlasCacheLimit = 10;
if (false)
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

const areaTextArr = ["20평 미만", "20평대", "30평대","40평대","50평이상"];

let currentZoom = 7;

const $rangeArea = $("#areaSlider");
$rangeArea.ionRangeSlider();
const sliderInstanceArea = $rangeArea.data("ionRangeSlider");

const $rangePart= $("#partSlider");
$rangePart.ionRangeSlider();
const sliderInstancePart= $rangePart.data("ionRangeSlider");

let onRefresh = false;

const xMul = 130;
const yMul = -1.5;

let alpha__ = 180;

let rankUnit = 0.05;
let rankMax = 1.0;
let rankMin = rankMax - rankUnit;

let groupMax = 0;
let priceMax = 0;

let areaSetIdx = 2;

let dataTrans = new Array();

let areaDataMap = new Map();

let groupAvgPath = new Array();
let avgPathMap = new Map();
let axisData = new Array();
let axisTextData = new Array();
let maxTextData = new Array();

window.onload = function() {
  const mobileWarning = document.getElementById("mobileWarning");

  // 모바일 기기인지 판별
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
      mobileWarning.style.display = "block";
  }

  // 메시지를 클릭하면 메시지를 숨김
  mobileWarning.addEventListener("click", function() {
      mobileWarning.style.display = "none";
  });
}


const deckgl = new Deck({

  onWebGLInitialized: (gl) => {
    gl.clearColor(10, 10, 10, 255); // RGB values range from 0 to 1. Here it sets a black clear color.
  },

  parent: document.getElementById('container'),
  views: new OrthographicView(),
  initialViewState: {
    target : [3000*xMul,250000*yMul,0],
    zoom: -9.5,    
    minZoom : -12
  },
  controller: true,
  //{doubleClickZoom: false, touchRotate: true},
  getTooltip: ({object}) => {

    if (object) {

      return {
        html: `<div class="tltp">${addDaysToDate(object.date)}</div>
        <div class="tltp">${formatPrice(object.price)}</div>
        <div class="tltp">${object.area}㎡</div>`,
        style : {
          padding : '10px',
          overflow : 'hidden',
          backgroundColor : '#000000aa',
          fontSize :'1.0em',
          color : '#ffffff',
          fontFamily : 'Pretendard-Regular',
          textAlign : 'center',
          borderRadius : '8px'
        }
      }
    }


  },

});



function formatPrice(price) {

  if (price==0) return `0원`

  let billion = Math.floor(price / 10000);
  let million = price % 10000;

  
  if (billion === 0) {
      return `${million}만원`;
  } else {
      return `${billion}억 ${million === 0 ? '' : million + '만원'}`;
  }
}

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


let dataGroup = new Map();
const date20060101 = new Date("2006-01-01");



refreshAreaSet();






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


function monthGroupToDate(monthGroup, day) {
  const year = (monthGroup/12) + 2006;
  const month = monthGroup%12;
  let date = new Date(year, month, day);
  return Math.floor((date-date20060101) / (1000 * 60 * 60 * 24));
}
//console.log("addDaysToDate(5)", addDaysToDate(5));



function mainloop() {


  const layers =  [

    new TextLayer({
      id: 'axis-text',
      data:  axisTextData,
      characterSet : 'auto',  
      getText: d=> d.text,
      getPosition: d=> d.pos,
      getSize: d=>d.size,
      sizeUnits : 'meters',
      getColor: d=>d.color,
      //sizeUnits: 'pixels',
      //sizeMaxPixels: 64,
      visible : true,
      getAngle: d=>d.angle,
      fontFamily: 'Pretendard-Regular',
      getTextAnchor: d=>d.textAnchor,
      getAlignmentBaseline: d=>d.alignmentBaseline,
      sizeMinPixels: 10
      // updateTriggers: {
      //   // This tells deck.gl to recalculate radius when `currentYear` changes
      //   getText : [year]
       
      // },
    }),
    new LineLayer({
      id: 'axis',
      data : axisData,
      //pickable: true,
      getWidth: d => d.width,
      getSourcePosition: d => d.from,
      getTargetPosition: d => d.to,
      getColor: d => d.color,

    }),

    new ScatterplotLayer({
      id: 'prices',
      data: dataTrans,
      
      // Styles
      filled: true,
      stroked : false,
      radiusMinPixels: 2,
      radiusScale: 1,
      getPosition: d => d.pos,
      getRadius: xMul/2,
      radiusUnits: 'meters',
      getFillColor:  [5, 42, 210, alpha__],
      // Interactive props
      pickable: true,
      autoHighlight: true,
      // onHover: ({object}) => {
      //   if (object) {
      //     console.log(object);
      //     return {
      //       html: `<h3>${object.date}</h3><h3>${object.price}도</h3>`,
      //       style: {
      //         backgroundColor: '#000000aa',
      //         fontSize: '0.8em',
      //         color : '#ffffff'
      //       }
      //     };
      //   }
      // },

      updateTriggers: {
        // This tells deck.gl to recalculate radius when `currentYear` changes
        getRadius : []
       
      },
      parameters: {
        blendFunc:[GL.SRC_ALPHA, GL.ONE, GL.ONE_MINUS_DST_ALPHA, GL.ONE],
        blendEquation: GL.FUNC_REVERSE_SUBTRACT,
        depthTest: false,
      },
      //visible : visible02,
      getFilterValue: d => [d.rankR],
      filterRange: [[rankMin, rankMax]],
      extensions: [new DataFilterExtension({filterSize: 1})]    
    }),

    new PathLayer({
      id: 'line-layer',
      data : groupAvgPath,
      //pickable: true,
      getWidth: d => d.width,
      widthScale: 1,
      widthMinPixels: 2,
      widthMaxPixels: 6,
      getPath: d => d.path,
      getColor: d => d.color,
      jointRounded : true
    }),

    new TextLayer({
      id: 'max-text',
      data:  maxTextData,
      characterSet : 'auto',  
      getText: d=> d.text,
      getPosition: d=> d.pos,
      getSize: d=>d.size,
      sizeUnits : 'meters',
      getColor: d=>d.color,
      //sizeUnits: 'pixels',
      //sizeMaxPixels: 64,
      visible : true,
      getAngle: d=>d.angle,
      fontFamily: 'Pretendard-Regular',
      getTextAnchor: d=>d.textAnchor,
      getAlignmentBaseline: d=>d.alignmentBaseline,
      sizeMinPixels: 10,
      sizeMaxPixels: 30
      // updateTriggers: {
      //   // This tells deck.gl to recalculate radius when `currentYear` changes
      //   getText : [year]
       
      // },
    }),


  ];
  

  deckgl.setProps({layers});
};

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////



function refreshAreaSet() {

  if (onRefresh) return;
  onRefresh = true;
  showLoadingAlert(true);

  const fileName = ["0020", "2030", "3040","4050","5099"];

  

  if (areaDataMap.has(areaSetIdx)) {
    avgPathMap = new Map();
    axisData = new Array();
    axisTextData = new Array();
    dataGroup = new Map();
    maxTextData = new Array();
    groupMax = 0;
    priceMax = 0;
    ({dataTrans, dataGroup, groupMax, priceMax} = areaDataMap.get(areaSetIdx));
    makeAvgPath();   
    makeAxisData();
    refreshTitle();   
    mainloop();
    showLoadingAlert(false);
    onRefresh = false;
    //console.log("fileName", fileName[areaSetIdx]);

  } else {
  
    setTimeout(() => {
      avgPathMap = new Map();
      axisData = new Array();
      axisTextData = new Array();
      dataGroup = new Map();
      maxTextData = new Array();
      groupMax = 0;
      priceMax = 0;

      const fileDate = "./data/"+fileName[areaSetIdx] + "date.bin";
      const filePrice = "./data/"+fileName[areaSetIdx] + "price.bin";
      const fileArea = "./data/"+fileName[areaSetIdx] + "area.bin";

      Promise.all([loadBinaryDataFromFile(fileDate),
        loadBinaryDataFromFile(filePrice),
        loadBinaryDataFromFile(fileArea)])
      .then(results => {
        const dataDate = results[0];
        const dataPrice = results[1];
        const dataArea = results[2];
        // 두 결과를 종합
        const st = new Date();
        dataTrans = new Array(dataDate.length/2);
        for(let i = 0; i < dataDate.length; i+=2) {
            
          const date = dataDate[i] * 256 + dataDate[i+1];
          const price = (dataPrice[i] * 256 + dataPrice[i+1]) * 100;
          const area = (dataArea[i] * 256 + dataArea[i+1]) / 100;

          if (priceMax<price) priceMax = price;
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
            area : area,
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
      
        //저장한다.
        areaDataMap.set(areaSetIdx, {dataTrans, dataGroup,  groupMax, priceMax});
        makeAvgPath();   
        makeAxisData();
        refreshTitle();   
        mainloop();
        //console.log("fileName", fileName[areaSetIdx]);
        onRefresh = false;
        showLoadingAlert(false);
      })
      .catch(error => {
          console.error("Error in loading binary data:", error);
      });

    }, 500);
  }

}




//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener("keydown", (e) => {
  // if (e.key=='+') {
  //   rankMin += 0.1;
  //   rankMax += 0.1;
  //   if (rankMax>=1.0) {
  //     rankMin = 0.9;
  //     rankMax = 1.0;
  //   }
  // }
  // if (e.key=='-') {
  //   rankMin -= 0.1;
  //   rankMax -= 0.1;
  //   if (rankMin<=0.0) {
  //     rankMin = 0.0;
  //     rankMax = 0.1;
  //   }
  // }
  if (e.key=='1') alpha__ += 10;
  if (e.key=='2') alpha__ -= 10;
  console.log(alpha__);
  makeAvgPath();      
  mainloop();
});

//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

function makeAvgPath() {

  const key = areaSetIdx + rankMin;
  if (avgPathMap.has(key)) {
    ({groupAvgPath, maxTextData} = avgPathMap.get(key));
    return;
  }

  let avgMax ={
    value : 0,
    month : 0
  };
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
    if (avg>avgMax.value) {
      avgMax.value = avg;
      avgMax.month = group;
    }
    avgPath[group] = {
      monthGroup : group,
      date : monthGroupToDate(group, 15),
      avgPrice : avg,      
    }
  }
  //console.log("avgPath", avgPath);
  const pathArr = new Array();
  for (const d of avgPath) {
    pathArr.push([d.date * xMul, d.avgPrice * yMul]);
  }

  groupAvgPath = new Array();
  maxTextData = new Array();
  groupAvgPath.push({
    path : pathArr,
    width : 3000,
    widthMinPixel : 5,
    color : [115,184,199,255]
  });
  groupAvgPath.push({
    path : [[(monthGroupToDate(0, 1)-100)* xMul , avgMax.value * yMul], 
            [ monthGroupToDate(groupMax+3, 20)* xMul, avgMax.value * yMul]],
    width : 10,
    color : [52, 117, 163,255]
  });


  const maxYear = (parseInt(avgMax.month/12) + 2006) + "년 ";
  const maxMonth = ((avgMax.month%12) + 1)+"월"
  const d = {
    text : '월 단위 평균 최대값 : '+ maxYear + maxMonth + ", " + formatPrice(parseInt(avgMax.value)),
    pos :  [monthGroupToDate(36, 1)* xMul, (avgMax.value+1000) * yMul],
    size : 17000,
    color : [0,0,0,255],
    angle : 0,
    alignmentBaseline : 'bottom',
    textAnchor : 'start'
  };
  maxTextData.push(d);   

  avgPathMap.set(key, {groupAvgPath, maxTextData});
}

function makeAxisData () {


  const yOffset = -3000;
  const xOffset = 20;
  //x축
  {
    const d = {
      from : [monthGroupToDate(0, 1)* xMul, yOffset * yMul],
      to  : [monthGroupToDate(groupMax+1, 1)* xMul, yOffset * yMul],
      width : 5,
      color : [0,0,0,255]
    };
    axisData.push(d);
  }

  //x축 눈금
  {
    const tickArr_x = [5, 2, 2, 2, 2, 2, 3.5, 2, 2, 2, 2, 2];
    for (let month=0 ; month<=groupMax+1 ; month++) {

      const d = {
        from : [monthGroupToDate(month, 1)* xMul, yOffset * yMul],
        to  : [monthGroupToDate(month, 1)* xMul, (yOffset - (600*tickArr_x[month%12])) * yMul],
        width : tickArr_x[month%12],
        color : [0,0,0,255]
      };
      axisData.push(d);

      if (month%12==0) {
        const d = {
          text : ""+ ((month/12)+2006) +".01",
          pos : [monthGroupToDate(month, 1)* xMul, (yOffset - (600*tickArr_x[month%12])) * yMul],
          size : 1000,
          color : [0,0,0,255],
          angle : 0,
          alignmentBaseline : 'top',
          textAnchor : 'middle'
        };
        axisTextData.push(d);

        //x축 보조 눈금
        const d0 = {
          from : [monthGroupToDate(month, 1)* xMul, yOffset * yMul],
          to  : [monthGroupToDate(month, 1)* xMul, priceMax * yMul],
          width : 1,
          color : [150,150,150,150]
        };
        axisData.push(d0);
      }

    }
  }

  //y축
  {
    const d = {
      from : [(monthGroupToDate(0, 1)-xOffset)* xMul, 0 * yMul],
      to  : [(monthGroupToDate(0, 1)-xOffset)* xMul, priceMax * yMul],
      width : 5,
      color : [0,0,0,255]
    };
    axisData.push(d);
  }

  //y축 눈금
  {
    const tickArr_y = [5, 2, 2, 2, 2, 3.5, 2, 2, 2, 2];
    for (let yy=0 ; yy<=priceMax ; yy += 1000) {

      const yIdx = yy/1000;
      let tickSize = tickArr_y[yIdx%10]*5;
      if (yy%50000==0) tickSize *= 2;
      const d = {
        from : [(monthGroupToDate(0, 1)-xOffset - tickSize)* xMul, yy * yMul],
        to  : [(monthGroupToDate(0, 1)-xOffset)* xMul, yy * yMul],
        width : tickArr_y[yIdx%10],
        color : [0,0,0,255]
      };
      axisData.push(d);

      //y축 보조눈금
      if (yy%10000==0) {
        const d = {
          from : [(monthGroupToDate(0, 1)-xOffset)* xMul, yy * yMul],
          to  : [monthGroupToDate(groupMax+1, 1)* xMul, yy * yMul],
          width : 1,
          color : [200,200,200,80]
        };
        axisData.push(d);
      }

      //y축 텍스트
      if (yy%10000==0) {

        const d = {
          text : formatPrice(yy),
          pos :  [(monthGroupToDate(0, 1)-xOffset - tickSize)* xMul, yy * yMul],
          size : yy%50000==0? 1800 : 1000,
          color : [0,0,0,255],
          angle : 0,
          alignmentBaseline : 'center',
          textAnchor : 'end'
        };
        axisTextData.push(d);       
      }

    }
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

function refreshTitle() {
  const doc = document.getElementById("staticItems");
  while (doc.firstChild) {
    doc.removeChild(doc.firstChild);
  }

  let tx;
  tx =  `전국 아파트 매매 실거래가(2006.01~2013.07)`;
  drawTitle(tx, 1);

  tx = areaTextArr[areaSetIdx] + " &nbsp;&nbsp;실거래가&nbsp;" + parseInt(rankMin*100)+"%~"+parseInt(rankMax*100)+"%&nbsp;구간(월 단위)";
  drawTitle(tx, 2);

  function drawTitle(text, tagLevel) {
    
    let plines = '<h'+tagLevel+'>'+ text+'</h'+tagLevel+'>';  
    const div = document.createElement('div');
    div.innerHTML = plines;
    div.className = 'title'+tagLevel;
    doc.appendChild(div);
  }
}

function showLoadingAlert(isOn) {
  if (isOn) {
    
    $("#loadingAlert").html(`<svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
  <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
  </svg>`);
    
    //console.log("on-----------"+(a++));
    
  } else {
    $("#loadingAlert").html('');    
    //console.log("off");
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

sliderInstanceArea.update({
  skin: "big",

  //grid : true,
  min: 0,
  max: 4,
  //values: custom_values,
  from: areaSetIdx,   
  // to : 100,
  step : 1,
  //prettify_enabled: true,
  //prettify_separator: ",",
  // prettify : (n) => ( Math.pow(n,powValue).toFixed(0)),
  //postfix: "%",

  prettify : (n) => {
    
    return areaTextArr[n];
  },

  onChange:  (sliderData) => { 
    if ( areaSetIdx != sliderData.from) {
      areaSetIdx = sliderData.from;
      //console.log("onChange!! sliderInstanceArea");
      refreshAreaSet();
    }
  }    
});

sliderInstancePart.update({
  skin: "big",

  //grid : true,
  min: 0,
  max: 1.0 - rankUnit,
  //values: custom_values,
  from: rankMin,   
  // to : 100,
  step :rankUnit,
  prettify : (n) => {
    const text = ""+Math.round(n*100)+"%~"+Math.round((n+rankUnit)*100)+"%";
    return text;
  },
  //prettify_enabled: true,
  //prettify_separator: ",",
  // prettify : (n) => ( Math.pow(n,powValue).toFixed(0)),
  //postfix: "%",

  onChange:  (sliderData) => { 
    if (rankMin!=sliderData.from) {
      rankMin = sliderData.from; 
      rankMax = rankMin + rankUnit;
      //console.log("onChange sliderInstancePart!!");
      makeAvgPath();     
      refreshTitle();    
      mainloop();
    }
  }    
});

