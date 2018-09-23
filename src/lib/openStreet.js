

class Descriptor{
    constructor(){
        this.desURL = "http://a.tile.openstreetmap.org/";
        this.desTileSize = 256;
        this.desOverlap = 0;
        this.desFormat = "png";
        this.offsetX=1;
        this.offsetY=1;
    }
}


class DrawingContext{
    constructor(canvas,maxLevel){
        this.canvas=canvas;
        this.ctx = canvas.getContext('2d');
        this.lastX =0; canvas.width / 2, this.lastY = canvas.height / 2;
        this.dragStart=false;
        this.dragged=false;
        this.level = 1;
        this.maxLevel=maxLevel;
    }
}


class OpenStreetRenderer{
    constructor(canvas){
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
        this.inTransit={}
        canvas.addEventListener('mousedown',this.onMouseDown,false);
        canvas.addEventListener('mousemove',this.onMouseMove,false);
        canvas.addEventListener('mouseup',this.onMouseUp,false);
        canvas.addEventListener('DOMMouseScroll',this.onMouseWheel,false);
        canvas.addEventListener('mousewheel',this.onMouseWheel,false);
        this.trackTransforms(this.drawingContext.ctx);
        this.draw(this.drawingContext)
        this.debounceDraw=this.debounce(this.draw,100);
    }


    onMouseDown=(evt)=>{
        document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
        this.drawingContext.lastX = evt.offsetX || (evt.pageX - this.drawingContext.canvas.offsetLeft);
        this.drawingContext.lastY = evt.offsetY || (evt.pageY - this.drawingContext.canvas.offsetTop);
        this.drawingContext.dragStart = this.drawingContext.ctx.transformedPoint(this.drawingContext.lastX, this.drawingContext.lastY);
        this.drawingContext.dragged = false;
    }

    onMouseMove=(evt)=>{
        this.drawingContext.lastX = evt.offsetX || (evt.pageX - this.drawingContext.canvas.offsetLeft);
        this.drawingContext.lastY = evt.offsetY || (evt.pageY - this.drawingContext.canvas.offsetTop);
        this.drawingContext.dragged = true;
        if(this.drawingContext.dragStart) {
            var pt = this.drawingContext.ctx.transformedPoint(this.drawingContext.lastX, this.drawingContext.lastY);
            this.drawingContext.ctx.translate(pt.x - this.drawingContext.dragStart.x, pt.y - this.drawingContext.dragStart.y);
            this.draw(this.drawingContext);
        }
    }
    onMouseUp=(evt)=>{
        this.drawingContext.dragStart = null;
        this.drawingContext.dragged = false;
    }

    onMouseWheel=(evt)=>{
        this.handleScroll(event,this)
    }



    setUrl(url){
        var xmlHttp = null;
        xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", url, true );
        xmlHttp.onreadystatechange()
        {
            // if (xmlHttp.readyState==4 && xmlHttp.status==200)
            //  {
            //console.log("Response: "+xmlHttp.responseText);
            //  }
        }
        xmlHttp.send( );

        return xmlHttp.responseText;
    }

    handleScroll (evt,obj) {
        var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
        if(delta)
        obj.zoom(delta,obj)
        return evt.preventDefault() && false;
    }

    zoom (clicks,obj) {
        //with(obj.drawingContext){
            //console.log("INIT Level "+level)
            //document.getElementById("demo").innerHTML=clicks
            var factor=1;
            if(clicks > 0){
                factor =2;
                //level=level>4?4:level+1;
                obj.drawingContext.level = obj.drawingContext.level + 1;
            }
            else{
                factor=1/2;
                obj.drawingContext.level = obj.drawingContext.level - 1

            }
            //cosole.log("MaxLevel"+maxLevel)
            if(obj.drawingContext.level>obj.drawingContext.maxLevel)
            {
                obj.drawingContext.level=obj.drawingContext.maxLevel;
                return;
            }
            if (obj.drawingContext.level<2){
                obj.drawingContext.level=2;
                return ;
            }

            var pt =obj.drawingContext.ctx.transformedPoint(obj.drawingContext.lastX,obj.drawingContext.lastY);

            obj.drawingContext.ctx.translate(pt.x,pt.y);
            obj.drawingContext.ctx.translate(-pt.x*factor,-pt.y*factor);
            this.debounceDraw(obj.drawingContext)
            //obj.draw(obj.drawingContext);

        //}
    }

    debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate)
                    func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow)
                func.apply(context, args);
        };
    }

    getUrlId(col,row,maxlevel){
        var result={col:this.normalize(col,maxlevel),row:this.normalize(row,maxlevel)}
        return result;
    }

    normalize(item,max){
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


    onImageload = (tileImg, level,normPos)=> {
        return ()=>{
            let intransit= this.getIntransit(level,normPos.col,normPos.row)
            let pos=null
            for(let i=0;i<intransit.length;i++){
                pos=intransit[i]
                this.drawingContext.ctx.drawImage(tileImg, pos.x, pos.y);
            }
            
        }
    }

    addToTransit=(level,col, row,position)=>{
        let key=this.genKey(level,col, row)
        if (!this.inTransit[key])
            this.inTransit[key]=[];
        this.inTransit[key].push(position)
    }
    genKey(level,col, row,position){
        return `L${level}-C${col}-R${row}`;
    }
    getIntransit=(level,col, row)=>{
        let key=this.genKey(level,col, row)
        let result =this.inTransit[key];
        delete this.inTransit[key];
        return result;
    }

    draw(drawingContext) {
        this.clearCanvas(drawingContext);
        let colrows = this.getLevelRowCol(drawingContext.level);
        let loop=this.getVisibleRowCols(drawingContext.ctx,drawingContext.level,colrows.cols,colrows.rows,this.desTileSize)
        let urlId={}
        let position={}
        for(let col = loop.sc; col < loop.ec; col++) {
            for(var row = loop.sr; row <loop.er; row++) {
                urlId=this.getUrlId(col,row,colrows.cols)
                let tile= this.cache.getFromCache(drawingContext.level, urlId.col, urlId.row);
                position = this.getTilePosition(col, row);
                if(!tile) {
                    tile = new Image();
                    tile.onload =  this.onImageload(tile,drawingContext.level,urlId );
                    this.addToTransit(drawingContext.level,urlId.col,urlId.row ,position)
                    tile.src = this.getTileURL(drawingContext.level, urlId.col,  urlId.row);
                    this.cache.putToCache(drawingContext.level,  urlId.col,  urlId.row, tile);
                } else {

                    if(tile.height==0){
                        this.addToTransit(drawingContext.level,urlId.col,urlId.row ,position)
                        console.log('The image was not loaded')
                        console.log('level'+drawingContext.level+" Col"+urlId.col+" Row"+urlId.row);
                    }
                    else{
                        drawingContext.ctx.drawImage(tile, position.x, position.y);
                    };
                }
            }
        }

        // var coor=this.coorh.LatLongtoPoint(36.52978,-6.29465,drawingContext.level)
        // this.drawPoint(drawingContext,coor)
        // coor=this.coorh.LatLongtoPoint(48.8566, 2.3522,drawingContext.level)
        // this.drawPoint(drawingContext,coor);
        // coor=this.coorh.LatLongtoPoint(-41.2865,174.7762,drawingContext.level);
        // this.drawPoint(drawingContext,coor);
    }


    drawPoint(drawingContext,coor){
        drawingContext.ctx.beginPath();
        drawingContext.ctx.arc(coor.x, coor.y, 5, 0, 2 * Math.PI, false);
        drawingContext.ctx.fillStyle = 'grey';
        drawingContext.ctx.fill();
        drawingContext.ctx.lineWidth = 1;
        drawingContext.ctx.strokeStyle = '#003300';
        drawingContext.ctx.stroke();

    }

    trackTransforms (ctx) {
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

    clearCanvas(drawingContext) {

        //console.log("clearCanvas"+drawingContext.ctx)
        //with(drawingContext)
    // {
            var p1 = drawingContext.ctx.transformedPoint(0, 0);
            var p2 = drawingContext.ctx.transformedPoint(drawingContext.canvas.width, drawingContext.canvas.height);
            drawingContext.ctx.clearRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        //}
    }

    getLevelRowCol(level) {
        //var maxLevel = getMaximumLevel(desWidth, desHeight);
        var nt = Math.pow(2, level);

        return {
            cols : nt,
            rows : nt
        };
    }

    getVisibleRowCols(ctx,level,maxc,maxr,desTileSize){
        var pt = ctx.transformedPoint(0,0);

        var result=new Object;
        result.sc=Math.ceil(pt.x/desTileSize)-1;
        result.ec=Math.ceil((this.width+pt.x)/desTileSize);//Fixme 1000 is just hard coded need to know the with

        result.sr=Math.ceil(pt.y/desTileSize)-1;
        result.er=Math.ceil((this.height+pt.y)/desTileSize);

        return result;
    }



    getMaximumLevel() {
        return 19;
    }  

    getTileURL(level, column, row) {
        // source:    Path to the Deep Zoom image descriptor XML
        // extension: Image format extension, e.g <Image … Format="png"/>
        return this.desURL  + level + "/" + column + "/" + row + "." + this.desFormat
    }

    getTilePosition(column, row) {
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

    flush()
    {
        this.cache.flush();
    }
}

class Cache{
    constructor(){
        this.cacheImages = new Object;
    }
    
    getFromCache (level, column, row){
        var key = "R" + level + "|" + column + "|" + row;
        return this.cacheImages[key];
    }
    putToCache(level, column, row, img){
        var key = "R" + level + "|" + column + "|" + row;
        this.cacheImages[key] = img;
    }

    flush(){
        this.cacheImages =null;
        this.cacheImages = new Object;
        //console.log("Flushing....");
    }
}
////////////////////////////
/////COORDINATES///////////
//////////////////////////


class CoordinateHelper{
    constructor(){
        this.maxLat=90;
        this.minLat=-90;
        this.maxLong=180;
        this.minLong=-180;
    }
    LatLongtoPoint(lat,log,level)
    {
        var result={x:0,y:0}
        var levelpixels=this.getPixelsLevel(level);
        result.x=this.transformLong(log,levelpixels);
        result.y=this.transformLat(lat,levelpixels);
        return result;

    }

    getPixelsLevel(level)
    {
        return (Math.pow(2, level)*256);

    }
    transformLong(longitude,mapWidth)
    {
        return (longitude+180)*(mapWidth/360);
    }
    transformLat(latitude,mapWidth)
    {
        var latRad = latitude*Math.PI/180;
        let mercN = Math.log(Math.tan((Math.PI/4)+(latRad/2)));
        let  y     = (mapWidth/2)-(mapWidth*mercN/(2*Math.PI));
        return y;
    }

    PointtoLatLong(lat,log,level)
    {
        var result={lon:0,lat:0}
        var levelpixels=this.getPixelsLevel(level);
        result.x=this.transformLong(log,levelpixels);
        result.y=this.transformLat(lat,levelpixels);
        return result;

    }

    transformX(x,mapWidth)
    {
        longitude=(((mapWidth/360)*180)-x)/-(mapWidth/360)

        return longitude;
    }
    transformY(y,mapWidth)
    {
        var latRad = latitude*Math.PI/180;
        mercN = Math.log(Math.tan((Math.PI/4)+(latRad/2)));
        y     = (mapWidth/2)-(mapWidth*mercN/(2*Math.PI));
        return y;
    }
}
 export default  OpenStreetRenderer;