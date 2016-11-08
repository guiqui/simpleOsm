/**
 * @author guillermo quiros 2016
 * MIT License

 Copyright (c) 2016 Guillermo Quiros

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.

 */

//////////////////////////
//////DESCRIPTOR//////////
//////////////////////////
function Descriptor(){
    this.desURL = "http://a.tile.openstreetmap.org/";
    this.desTileSize = 256;
    this.desOverlap = 0;
    this.desFormat = "png";
    this.offsetX=1;
    this.offsetY=1;
}
////////////////////////////
///////DRAWING INFO////////
//////////////////////////

function DrawingContext(canvas,maxLevel){
    this.canvas=canvas;
    this.ctx = canvas.getContext('2d');
    this.lastX =0; canvas.width / 2, this.lastY = canvas.height / 2;
    this.dragStart=false;
    this.dragged=false;
    this.level = 1;
    this.maxLevel=maxLevel;
}
//////////////////////////
//////CANVAS/////////////
////////////////////////

function OpenStreetRenderer(canvas)
{

    //console.log("INIT"+canvas.width)
    //console.log("INIT Contex"+canvas.width)
    this.descriptor=new Descriptor;
    this.desURL = "http://a.tile.openstreetmap.org/";
    this.desTileSize = 256;
    this.desOverlap = 0;
    this.desFormat = "png";
    this.offsetX=1;
    this.offsetY=1;
    this.width=canvas.width;
    this.height=canvas.height;
    this.cache=new Cache();
    this.drawingContext=new DrawingContext(canvas,this.getMaximumLevel());
    this.maxLevel=this.getMaximumLevel( );
    this.coorh=new CoordinateHelper();
    /* MOUSE LISTENERS*/
    (function (drawingContext){
        canvas.addEventListener('mousedown', function(evt) {
            with(drawingContext){
                document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
                lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
                lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
                dragStart = ctx.transformedPoint(lastX, lastY);
                dragged = false;
            }
        }, false)}(this.drawingContext));

    (function (obj){
        canvas.addEventListener('mousemove', function(evt) {
            with(obj.drawingContext){
                lastX = evt.offsetX || (evt.pageX - canvas.offsetLeft);
                lastY = evt.offsetY || (evt.pageY - canvas.offsetTop);
                dragged = true;
                if(dragStart) {
                    var pt = ctx.transformedPoint(lastX, lastY);
                    ctx.translate(pt.x - dragStart.x, pt.y - dragStart.y);
                    obj.draw(obj.drawingContext);
                }
            }
        }, false)}(this));

    (function (drawingContext){
        canvas.addEventListener('mouseup', function(evt) {
            drawingContext.dragStart = null;
            dragged = false;
            //if(!dragged)
            //	zoom(evt.shiftKey ? -1 : 1);
        }, false)}(this.drawingContext));

    (function (obj){
        canvas.addEventListener('DOMMouseScroll',function(event){
            //console.log("Evento"+event)
            obj.handleScroll(event,obj)
        }, false);
    }(this));

    (function (obj){
        canvas.addEventListener('mousewheel',function(event){
            //console.log("Evento"+event)
            obj.handleScroll(event,obj)
        }, false);
    }(this));

    this.trackTransforms(this.drawingContext.ctx);
    this.draw(this.drawingContext)

}


OpenStreetRenderer.prototype.setUrl=function(url)
{
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", url, true );
    xmlHttp.onreadystatechange=function()
    {
        // if (xmlHttp.readyState==4 && xmlHttp.status==200)
        //  {
        //console.log("Response: "+xmlHttp.responseText);
        //  }
    }
    xmlHttp.send( );

    return xmlHttp.responseText;
}
OpenStreetRenderer.prototype.handleScroll = function(evt,obj) {
    var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
    if(delta)
        obj.zoom(delta,obj);

    // clearTimeout($.data(this, 'timer'));
    // $.data(this, 'timer', setTimeout(function() {
    //     alert("Haven't scrolled in 250ms!");
    //     //do something
    // }, 250));

    return evt.preventDefault() && false;
}
OpenStreetRenderer.prototype.zoom = function(clicks,obj) {
    with(obj.drawingContext){
        //console.log("INIT Level "+level)
        //document.getElementById("demo").innerHTML=clicks
        var factor=1;
        if(clicks > 0){
            factor =2;
            //level=level>4?4:level+1;
            level = level + 1;
        }
        else{
            factor=1/2;
            level = level - 1

        }
        //cosole.log("MaxLevel"+maxLevel)
        if(level>maxLevel)
        {
            level=maxLevel;
            return;
        }
        if (level<2){
            level=2;
            return ;
        }

        var pt =ctx.transformedPoint(lastX,lastY);

        ctx.translate(pt.x,pt.y);
        ctx.translate(-pt.x*factor,-pt.y*factor);
        obj.draw(obj.drawingContext);
    }
}

OpenStreetRenderer.prototype.getUrlId=function(col,row,maxlevel){
    var result={col:this.normalize(col,maxlevel),row:this.normalize(row,maxlevel)}
    return result;
}

OpenStreetRenderer.prototype.normalize=function(item,max){
    var result=item;

    if (item>=max){
        item=item % max;

        result=item;
    }
    else if (item<0){
        item=item % max;
        if(item==-0) {
            result=0;
        }else {result=max+item;}
    }
    return result;
}


OpenStreetRenderer.prototype.draw=function(drawingContext) {
    //console.log("INIT USE"+drawingContext.ctx+"|"+drawingContext.level)
    this.clearCanvas(drawingContext);
    //document.write("Canvas Clear");
    var colrows = this.getLevelRowCol(drawingContext.level);
    var loop=this.getVisibleRowCols(drawingContext.ctx,drawingContext.level,colrows.cols,colrows.rows,this.desTileSize)
    //document.write(colrows.rows);
    //var tile
    var urlId={}
    var position={}
    for(var col = loop.sc; col < loop.ec; col++) {
        for(var row = loop.sr; row <loop.er; row++) {
            urlId=this.getUrlId(col,row,colrows.cols)
            var tile= this.cache.getFromCache(drawingContext.level, urlId.col, urlId.row);
            position = this.getTilePosition(col, row);
            if(!tile) {
                tile = new Image();

                tile.onload = (function(tileImg, pos) {
                    return function() {
                        drawingContext.ctx.drawImage(tileImg, pos.x, pos.y);
                        //document.write("context Drawing");
                    }
                })(tile, position);
                tile.src = this.getTileURL(drawingContext.level, urlId.col,  urlId.row);
                this.cache.putToCache(drawingContext.level,  urlId.col,  urlId.row, tile);
                //console.log("Creating to cache");
                //document.getElementById("demo").innerHTML="Creating to cache";
            } else {
                //document.getElementById("demo").innerHTML="loading from cache";
                if(tile.height==0){
                    console.log('The image was not loaded')
                    console.log('level'+drawingContext.level+" Col"+urlId.col+" Row"+urlId.row);
                }
                else{
                    drawingContext.ctx.drawImage(tile, position.x, position.y);
                };
            }
        }
    }

    var coor=this.coorh.LatLongtoPoint(36.52978,-6.29465,drawingContext.level)
    this.drawPoint(drawingContext,coor)
    coor=this.coorh.LatLongtoPoint(48.8566, 2.3522,drawingContext.level)
    this.drawPoint(drawingContext,coor);
    coor=this.coorh.LatLongtoPoint(-41.2865,174.7762,drawingContext.level);
    this.drawPoint(drawingContext,coor);


}


OpenStreetRenderer.prototype.drawPoint=function(drawingContext,coor){
    drawingContext.ctx.beginPath();
    drawingContext.ctx.arc(coor.x, coor.y, 10, 0, 2 * Math.PI, false);
    drawingContext.ctx.fillStyle = 'green';
    drawingContext.ctx.fill();
    drawingContext.ctx.lineWidth = 5;
    drawingContext.ctx.strokeStyle = '#003300';
    drawingContext.ctx.stroke();

}


OpenStreetRenderer.prototype.trackTransforms=function (ctx) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    var xform = svg.createSVGMatrix();
    ctx.getTransform = function() {
        return xform;
    };
    var savedTransforms = [];
    var save = ctx.save;
    ctx.save = function() {
        savedTransforms.push(xform.translate(0, 0));
        return save.call(ctx);
    };
    var restore = ctx.restore;
    ctx.restore = function() {
        xform = savedTransforms.pop();
        return restore.call(ctx);
    };
    var scale = ctx.scale;
    ctx.scale = function(sx, sy) {
        xform = xform.scaleNonUniform(sx, sy);
        return scale.call(ctx, sx, sy);
    };
    var rotate = ctx.rotate;
    ctx.rotate = function(radians) {
        xform = xform.rotate(radians * 180 / Math.PI);
        return rotate.call(ctx, radians);
    };
    var translate = ctx.translate;
    ctx.translate = function(dx, dy) {
        xform = xform.translate(dx, dy);
        return translate.call(ctx, dx, dy);
    };
    var transform = ctx.transform;
    ctx.transform = function(a, b, c, d, e, f) {
        var m2 = svg.createSVGMatrix();
        m2.a = a;
        m2.b = b;
        m2.c = c;
        m2.d = d;
        m2.e = e;
        m2.f = f;
        xform = xform.multiply(m2);
        return transform.call(ctx, a, b, c, d, e, f);
    };
    var setTransform = ctx.setTransform;
    ctx.setTransform = function(a, b, c, d, e, f) {
        xform.a = a;
        xform.b = b;
        xform.c = c;
        xform.d = d;
        xform.e = e;
        xform.f = f;
        return setTransform.call(ctx, a, b, c, d, e, f);
    };
    var pt = svg.createSVGPoint();
    ctx.transformedPoint = function(x, y) {
        pt.x = x;
        pt.y = y;
        return pt.matrixTransform(xform.inverse());
    }
}

OpenStreetRenderer.prototype.clearCanvas=function(drawingContext) {

    //console.log("clearCanvas"+drawingContext.ctx)
    with(drawingContext)
    {
        var p1 = ctx.transformedPoint(0, 0);
        var p2 = ctx.transformedPoint(canvas.width, canvas.height);
        ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    }
}

OpenStreetRenderer.prototype.getLevelRowCol=function(level) {
    //var maxLevel = getMaximumLevel(desWidth, desHeight);
    var nt = Math.pow(2, level);

    return {
        cols : nt,
        rows : nt
    };
}
OpenStreetRenderer.prototype.getVisibleRowCols=function(ctx,level,maxc,maxr,desTileSize){
    var pt = ctx.transformedPoint(0,0);

    var result=new Object;
    result.sc=Math.ceil(pt.x/desTileSize)-1;
    result.ec=Math.ceil((this.width+pt.x)/desTileSize);//Fixme 1000 is just hard coded need to know the with

    result.sr=Math.ceil(pt.y/desTileSize)-1;
    result.er=Math.ceil((this.height+pt.y)/desTileSize);

    return result;
}



OpenStreetRenderer.prototype.getMaximumLevel=function() {
    return 19;
}

OpenStreetRenderer.prototype.getTileURL=function(level, column, row) {
    // source:    Path to the Deep Zoom image descriptor XML
    // extension: Image format extension, e.g <Image … Format="png"/>
    return this.desURL  + level + "/" + column + "/" + row + "." + this.desFormat
}

OpenStreetRenderer.prototype.getTilePosition=function(column, row) {
    var position = {
        x : 0,
        y : 0
    }
    var offsetX = (column == 0 ) ? 0 : this.desOverlap
    var offsetY = (row == 0 ) ? 0 : this.desOverlap

    position.x = (column * this.desTileSize ) - offsetX
    position.y = (row * this.desTileSize ) - offsetY

    return position
}

OpenStreetRenderer.prototype.flush=function()
{
    this.cache.flush();
}

////////////////////////////
/////////CACHE/////////////
//////////////////////////

function Cache(){
    this.cacheImages = new Object;
}

Cache.prototype.getFromCache=function (level, column, row)
{
    var key = "R" + level + "|" + column + "|" + row;
    return this.cacheImages[key];
}

Cache.prototype.putToCache=function(level, column, row, img)
{
    var key = "R" + level + "|" + column + "|" + row;
    this.cacheImages[key] = img;
}

Cache.prototype.flush=function()
{
    this.cacheImages =null;
    this.cacheImages = new Object;
    //console.log("Flushing....");
}

////////////////////////////
/////COORDINATES///////////
//////////////////////////


function CoordinateHelper(){
    this.maxLat=90;//^
    this.minLat=-90;
    this.maxLong=180;
    this.minLong=-180;// <-->


}

CoordinateHelper.prototype.LatLongtoPoint=function(lat,log,level)
{
    var result={x:0,y:0}
    var levelpixels=this.getPixelsLevel(level);
    result.x=this.transformLong(log,levelpixels);
    result.y=this.transformLat(lat,levelpixels);
    return result;

}

CoordinateHelper.prototype.getPixelsLevel=function(level)
{
    return (Math.pow(2, level)*256);

}
CoordinateHelper.prototype.transformLong=function(longitude,mapWidth)
{
    return (longitude+180)*(mapWidth/360);
}
CoordinateHelper.prototype.transformLat=function(latitude,mapWidth)
{
    var latRad = latitude*Math.PI/180;
    mercN = Math.log(Math.tan((Math.PI/4)+(latRad/2)));
    y     = (mapWidth/2)-(mapWidth*mercN/(2*Math.PI));
    return y;
}

CoordinateHelper.prototype.PointtoLatLong=function(lat,log,level)
{
    var result={lon:0,lat:0}
    var levelpixels=this.getPixelsLevel(level);
    result.x=this.transformLong(log,levelpixels);
    result.y=this.transformLat(lat,levelpixels);
    return result;

}

CoordinateHelper.prototype.transformX=function(x,mapWidth)
{
    longitude=(((mapWidth/360)*180)-x)/-(mapWidth/360)

    return longitude;
}
CoordinateHelper.prototype.transformY=function(y,mapWidth)
{
    var latRad = latitude*Math.PI/180;
    mercN = Math.log(Math.tan((Math.PI/4)+(latRad/2)));
    y     = (mapWidth/2)-(mapWidth*mercN/(2*Math.PI));
    return y;
}