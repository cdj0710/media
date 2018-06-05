/**
 * Media for guosen.com.cn
 *
 * 用这个插件，浏览器或者webview必须支持input文件
 *
 * Copyright (c) 2012 lv <353998083@qq.com>
 * Released under the MIT license
 */

(function() {
  /**
   * Media class
   */
  function Media(options) {
    var  defaults= {
      id:'',       //用来展示媒体资源的DOM的id
      width:750,  
      height:0,
      isDebug:false,   //是否开启调试
      immediate:true,  //是否要实时拍摄，不能从相册获取
      compress:true,   //是否要压缩，仅支持图片压缩，不支持视频压缩
      type:1,                     //文件类型1-图片，2-视频
      success: function () {},   //失败回调
      fail: function () {}     //成功回调
    }
    options = Object.assign(defaults, options)
    if (document.getElementById(options.id)==null) {
      options.fail('参数错误：id值未传入！')
      // return
    }
    if (document.getElementById('inputBox')==null) {
      var inputBox = document.createElement('div')
      inputBox.id = 'inputBox'
      document.body.append(inputBox)
    }else{
      inputBox = document.getElementById('inputBox')
    }
    
    if(options.type == 1) {
      if (options.immediate) {
        acceptAttr = 'accept="image/*,camera"'
        capturetAttr = 'capture="camera"'
      }else{
        acceptAttr = 'accept="image/*"'
        capturetAttr = ''
      }
    }else if (options.type == 2) {
      if (options.immediate) {
        acceptAttr = 'accept="video/*,camera"'
        capturetAttr = 'capture="camera"'
      }else{
        acceptAttr = 'accept="video/*"'
        capturetAttr = ''
      }
    }
    inputBox.innerHTML  = '<input id="mediaInput" onchange="mediaInputChange()" type="file" '+acceptAttr+' '+capturetAttr+' style="border: none;color: #FFF;height: 0px;width:0px;left: -1000em;">'
    window.mediaInputChange = function(){
      var file = document.getElementById('mediaInput').files[0]
      var review = document.getElementById(options.id)
      console.log(review)
      console.log(file)
      if (options.immediate&&!options.isDebug) {
        if (!mediaCheck(file,options.type)) return
      }
      
      // 只支持图片压缩
      if (options.compress&&options.type==1) {
        var mpImg = new MegaPixImage(file);
        var orientation = 0
        if (isIos()) {
          orientation = 6
        }
        
        mpImg.render(review, { maxWidth: options.width, quality: 1 ,orientation:orientation },function(){
          options.success(dataURLtoBlob(review.src))
        });
      }else{
        var reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = function(){
          review.src = this.result
          options.success(file)
        }
      } 
    }
  }
  Media.prototype.start = function(){
    document.getElementById('mediaInput').click()
  }

  var isIos = function(){
    return !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  }
  /*
  **对媒体文件进行检查，包括文件类型，文件来源（拍摄/相册文件）
  *file  待检测的文件
  *type  文件类型1-图片，2-视频
  *返回  空
  **/
  var mediaCheck = function(file,mediaType){
    if (!file) return
    // lastModifiedDate=("object" == typeof file.lastModifiedDate && file.lastModifiedDate instanceof Date&&file.lastModifiedDate)
    var name = file.name,size=file.size,type=file.type,currentTime = (new Date).getTime(),fileTime = file.lastModified
    console.log(file)
    console.log('name:'+name)
    console.log('lastModified:'+file.lastModified)
    console.log('lastModifiedDate:'+file.lastModifiedDate)
    console.log(currentTime-fileTime)
    if (mediaType==1) {
      if (type.indexOf('image')==-1) {
        alert('上传文件格式不正确')
        // MessageBox('','上传文件格式不正确')
        return false
      }

      if (currentTime-fileTime > 4e3) {
        alert('不能选择相册文件')
        // MessageBox('','不能选择相册文件')
        return false
      }
      if (isIos()&&name.indexOf('image.')==-1) {
        alert('不能选择相册文件')
        // MessageBox('','不能选择相册文件')
        return false
      }
      return true
    }else if(mediaType==2){
      if (type.indexOf('video')==-1) {
        alert('上传文件格式不正确')
        // MessageBox('','上传文件格式不正确')
        return false
      }
      
      if (currentTime-fileTime > 2e4) {
        alert('请实时拍摄一段单向视频')
        // MessageBox('','请实时拍摄一段单向视频')
        return false
      }
      if (isIos()&&name.indexOf('trim.')>-1) {
        alert('请实时拍摄一段单向视频')
        // MessageBox('','请实时拍摄一段单向视频')
        return false
      }
      return true
    }
  }
  // 将base64转成file(blob)类型，用于multipart/form-data方式的传输
  var dataURLtoBlob = function(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }


  /**
   * Detect subsampling in loaded image.
   * In iOS, larger images than 2M pixels may be subsampled in rendering.
   */
  function detectSubsampling(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (iw * ih > 1024 * 1024) { // subsampling may happen over megapixel image
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, -iw + 1, 0);
      // subsampled image becomes half smaller in rendering size.
      // check alpha channel value to confirm image is covering edge pixel or not.
      // if alpha value is 0 image is not covering, hence subsampled.
      return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
    } else {
      return false;
    }
  }

  /**
   * Detecting vertical squash in loaded image.
   * Fixes a bug which squash image vertically while drawing into canvas for some images.
   */
  function detectVerticalSquash(img, iw, ih) {
    var canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = ih;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, 1, ih).data;
    // search image edge pixel position in case it is squashed vertically.
    var sy = 0;
    var ey = ih;
    var py = ih;
    while (py > sy) {
      var alpha = data[(py - 1) * 4 + 3];
      if (alpha === 0) {
        ey = py;
      } else {
        sy = py;
      }
      py = (ey + sy) >> 1;
    }
    var ratio = (py / ih);
    return (ratio===0)?1:ratio;
  }

  /**
   * Rendering image element (with resizing) and get its data URL
   */
  function renderImageToDataURL(img, options, doSquash) {
    var canvas = document.createElement('canvas');
    renderImageToCanvas(img, canvas, options, doSquash);
    return canvas.toDataURL("image/jpeg", options.quality || 0.8);
  }

  /**
   * Rendering image element (with resizing) into the canvas element
   */
  function renderImageToCanvas(img, canvas, options, doSquash) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!(iw+ih)) return;
    var width = options.width, height = options.height;
    var ctx = canvas.getContext('2d');
    ctx.save();
    transformCoordinate(canvas, ctx, width, height, options.orientation);
    var subsampled = detectSubsampling(img);
    if (subsampled) {
      iw /= 2;
      ih /= 2;
    }
    var d = 1024; // size of tiling canvas
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = tmpCanvas.height = d;
    var tmpCtx = tmpCanvas.getContext('2d');
    var vertSquashRatio = doSquash ? detectVerticalSquash(img, iw, ih) : 1;
    var dw = Math.ceil(d * width / iw);
    var dh = Math.ceil(d * height / ih / vertSquashRatio);
    var sy = 0;
    var dy = 0;
    while (sy < ih) {
      var sx = 0;
      var dx = 0;
      while (sx < iw) {
        tmpCtx.clearRect(0, 0, d, d);
        tmpCtx.drawImage(img, -sx, -sy);
        ctx.drawImage(tmpCanvas, 0, 0, d, d, dx, dy, dw, dh);
        sx += d;
        dx += dw;
      }
      sy += d;
      dy += dh;
    }
    ctx.restore();
    tmpCanvas = tmpCtx = null;
  }

  /**
   * Transform canvas coordination according to specified frame size and orientation
   * Orientation value is from EXIF tag
   */
  function transformCoordinate(canvas, ctx, width, height, orientation) {
    switch (orientation) {
      case 5:
      case 6:
      case 7:
      case 8:
        canvas.width = height;
        canvas.height = width;
        break;
      default:
        canvas.width = width;
        canvas.height = height;
    }
    switch (orientation) {
      case 2:
        // horizontal flip
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        // 180 rotate left
        ctx.translate(width, height);
        ctx.rotate(Math.PI);
        break;
      case 4:
        // vertical flip
        ctx.translate(0, height);
        ctx.scale(1, -1);
        break;
      case 5:
        // vertical flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        // 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -height);
        break;
      case 7:
        // horizontal flip + 90 rotate right
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(width, -height);
        ctx.scale(-1, 1);
        break;
      case 8:
        // 90 rotate left
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-width, 0);
        break;
      default:
        break;
    }
  }

  var URL = window.URL && window.URL.createObjectURL ? window.URL :
            window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
            null;

  /**
   * MegaPixImage class
   */
  function MegaPixImage(srcImage) {
    if (window.Blob && srcImage instanceof Blob) {
      if (!URL) { throw Error("No createObjectURL function found to create blob url"); }
      var img = new Image();
      img.src = URL.createObjectURL(srcImage);
      this.blob = srcImage;
      srcImage = img;
    }
    if (!srcImage.naturalWidth && !srcImage.naturalHeight) {
      var _this = this;
      srcImage.onload = srcImage.onerror = function() {
        var listeners = _this.imageLoadListeners;
        if (listeners) {
          _this.imageLoadListeners = null;
          for (var i=0, len=listeners.length; i<len; i++) {
            listeners[i]();
          }
        }
      };
      this.imageLoadListeners = [];
    }
    this.srcImage = srcImage;
  }

  /**
   * Rendering megapix image into specified target element
   */
  MegaPixImage.prototype.render = function(target, options, callback) {
    if (this.imageLoadListeners) {
      var _this = this;
      this.imageLoadListeners.push(function() { _this.render(target, options, callback); });
      return;
    }
    options = options || {};
    var imgWidth = this.srcImage.naturalWidth, imgHeight = this.srcImage.naturalHeight,
        width = options.width, height = options.height,
        maxWidth = options.maxWidth, maxHeight = options.maxHeight,
        doSquash = !this.blob || this.blob.type === 'image/jpeg';
    if (width && !height) {
      height = (imgHeight * width / imgWidth) << 0;
    } else if (height && !width) {
      width = (imgWidth * height / imgHeight) << 0;
    } else {
      width = imgWidth;
      height = imgHeight;
    }
    if (maxWidth && width > maxWidth) {
      width = maxWidth;
      height = (imgHeight * width / imgWidth) << 0;
    }
    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = (imgWidth * height / imgHeight) << 0;
    }
    var opt = { width : width, height : height };
    for (var k in options) opt[k] = options[k];

    var tagName = target.tagName.toLowerCase();
    if (tagName === 'img') {
      target.src = renderImageToDataURL(this.srcImage, opt, doSquash);
    } else if (tagName === 'canvas') {
      renderImageToCanvas(this.srcImage, target, opt, doSquash);
    }
    if (typeof this.onrender === 'function') {
      this.onrender(target);
    }
    if (callback) {
      callback();
    }
    if (this.blob) {
      this.blob = null;
      URL.revokeObjectURL(this.srcImage.src);
    }
  };

  /**
   * Export class to global
   */
  if (typeof define === 'function' && define.amd) {
    define([], function() { return Media }); // for AMD loader
  } else if (typeof exports === 'object') {
    module.exports = Media; // for CommonJS
  } else {
    this.Media = Media;
  }

})();
