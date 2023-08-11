import {Deck,OrthographicView}  from '@deck.gl/core';
import {ScatterplotLayer, LineLayer, PathLayer, BitmapLayer, SolidPolygonLayer, GeoJsonLayer, TextLayer} from '@deck.gl/layers';
import {DataFilterExtension} from '@deck.gl/extensions';
import {CSVLoader} from '@loaders.gl/csv';
import {JSONLoader} from '@loaders.gl/json'
import {TileLayer} from '@deck.gl/geo-layers';
import {load} from '@loaders.gl/core';
//const {JSONLoader, load} = json; 

import ionRangeSlider from 'ion-rangeslider';



let currentZoom = 7;

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

        dataTrans[i/2] = {
          date : date,
          price : price
        }
      }
      const et = new Date();
      console.log(dataTrans, et-st);
      mainloop();
  })
  .catch(error => {
      console.error("Error in loading binary data:", error);
  });



const originalDate = new Date("2006-01-01").getDate();
function addDaysToDate(daysToAdd) {
  // dateString 형식: 'YYYY-MM-DD'
  
  const newDate = new Date();
  newDate.setDate(originalDate + daysToAdd);

  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, '0');  // 0부터 시작하는 월 값을 가져와서 1을 더함
  const day = String(newDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

console.log("addDaysToDate(5)", addDaysToDate(5));



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
      getPosition: d => [d.date*xMul,d.price*yMul],
      getRadius: 3,
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
      // getFilterValue: d => [d.year],
      // filterRange: [[year-9, year]],
      // extensions: [new DataFilterExtension({filterSize: 1})]    
    }),

    // new ScatterplotLayer({
    //   id: 'seoulTemp2',
    //   data: tempData,
      
    //   // Styles
    //   filled: true,
    //   getFilterValue: d => [d.year],
    //   filterRange: [[year, year]],
    //   radiusMinPixels: 0,
    //   radiusScale: 1,
    //   getPosition: d => [d.day*xMul,d.avgTmp*yMul],
    //   getRadius: 5,
    //   radiusUnits: 'pixels',
    //   getFillColor:  [0,0,0,255],
    //   // Interactive props
    //   pickable: true,
    //   autoHighlight: true,
    //   // onHover: ({object}) => object && console.log(`일 최고기온 : ${object.maxTemp}`),

    //   updateTriggers: {
    //     // This tells deck.gl to recalculate radius when `currentYear` changes
    //     getRadius : []
       
    //   },
      
    //   //visible : visible02,
    //   extensions: [new DataFilterExtension({filterSize: 1})]    
    // }),

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
    // new PathLayer({
    //   id: 'line-layer',
    //   data : avgPath,
    //   //pickable: true,
    //   getWidth: 2,
    //   widthScale: 1,
    //   widthMinPixels: 2,
    //   getPath: d => d.path,
    //   getColor: [0,0,0,255],

    // }),

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

window.addEventListener("keydown", (e) => {
  if (e.key=='+') {
    
  }
  if (e.key=='-') {
    
  }
  update();
});




$(document).ready(function(){
 

});    

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
