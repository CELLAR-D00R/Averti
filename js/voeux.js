(function() {

var image = { // back and front images
  'back': { 'url':'images/voeux_averti_2.png', 'img':null },
	'front': { 'url':'images/neige2.jpg', 'img':null }
};

var canvas = {'temp':null, 'draw':null}; // temp and draw canvases

var mouseDown = false;



/**
 * Helper function to get the local coords of an event in an element,
 * since offsetX/offsetY are apparently not entirely supported, but
 * offsetLeft/offsetTop/pageX/pageY are!
 *
 * @param elem element in question
 * @param ev the event
 */
function getLocalCoords(elem, ev) {
	var ox = 0, oy = 0;
	var first;
	var pageX, pageY;

	// Walk back up the tree to calculate the total page offset of the
	// currentTarget element.  I can't tell you how happy this makes me.
	// Really.
	while (elem != null) {
		ox += elem.offsetLeft;
		oy += elem.offsetTop;
		elem = elem.offsetParent;
	}

	if (ev.hasOwnProperty('changedTouches')) {
		first = ev.changedTouches[0];
		pageX = first.pageX;
		pageY = first.pageY;
	} else {
		pageX = ev.pageX;
		pageY = ev.pageY;
	}

	return { 'x': pageX - ox, 'y': pageY - oy };
}

/**
 * Recomposites the canvases onto the screen
 *
 * Note that my preferred method (putting the background down, then the
 * masked foreground) doesn't seem to work in FF with "source-out"
 * compositing mode (it just leaves the destination canvas blank.)  I
 * like this method because mentally it makes sense to have the
 * foreground drawn on top of the background.
 *
 * Instead, to get the same effect, we draw the whole foreground image,
 * and then mask the background (with "source-atop", which FF seems
 * happy with) and stamp that on top.  The final result is the same, but
 * it's a little bit weird since we're stamping the background on the
 * foreground.
 *
 * OPTIMIZATION: This naively redraws the entire canvas, which involves
 * four full-size image blits.  An optimization would be to track the
 * dirty rectangle in scratchLine(), and only redraw that portion (i.e.
 * in each drawImage() call, pass the dirty rectangle as well--check out
 * the drawImage() documentation for details.)  This would scale to
 * arbitrary-sized images, whereas in its current form, it will dog out
 * if the images are large.
 */
function recompositeCanvases() {
  	var main = document.getElementById('maincanvas');
	var tempctx = canvas.temp.getContext('2d');
	var mainctx = main.getContext('2d');

	// Step 1: clear the temp
	canvas.temp.width = canvas.temp.width; // resizing clears

	// Step 2: stamp the draw on the temp (source-over)
	tempctx.drawImage(canvas.draw, 0, 0);

	/* !!!! this way doesn't work on FF:
		// Step 3: stamp the foreground on the temp (!! source-out mode !!)
		tempctx.globalCompositeOperation = 'source-out';
		tempctx.drawImage(image.front.img, 0, 0);

		// Step 4: stamp the background on the display canvas (source-over)
		//mainctx.drawImage(image.back.img, 0, 0);

		// Step 5: stamp the temp on the display canvas (source-over)
		mainctx.drawImage(canvas.temp, 0, 0);
	*/

	// Step 3: stamp the background on the temp (!! source-atop mode !!)
	tempctx.globalCompositeOperation = 'source-atop';
	tempctx.drawImage(image.back.img, 0, 0);

	// Step 4: stamp the foreground on the display canvas (source-over)
	mainctx.drawImage(image.front.img, 0, 0);

	// Step 5: stamp the temp on the display canvas (source-over)
	mainctx.drawImage(canvas.temp, 0, 0);
}

/**
 * Draw a scratch line
 *
 * @param can the canvas
 * @param x,y the coordinates
 * @param fresh start a new line if true
 */
function scratchLine(can, x, y, fresh) {
	var ctx = can.getContext('2d');
	ctx.lineWidth = 50;
	ctx.lineCap = ctx.lineJoin = 'round';
	ctx.strokeStyle = '#f00'; // can be any opaque color
	if (fresh) {
		ctx.beginPath();
		// this +0.01 hackishly causes Linux Chrome to draw a
		// "zero"-length line (a single point), otherwise it doesn't
		// draw when the mouse is clicked but not moved:
		ctx.moveTo(x+0.01, y);
	}
	ctx.lineTo(x, y);
	ctx.stroke();
}

/**
 * Set up the main canvas and listeners
 */
function setupCanvases() {
	var c = document.getElementById('maincanvas');
	// set the width and height of the main canvas from the first image
	// (assuming both images are the same dimensions)
	c.width = image.back.img.width;
	c.height = image.back.img.height;

	// create the temp and draw canvases, and set their dimensions
	// to the same as the main canvas:
	canvas.temp = document.createElement('canvas');
	canvas.draw = document.createElement('canvas');
	canvas.temp.width = canvas.draw.width = c.width;
	canvas.temp.height = canvas.draw.height = c.height;

	// draw the stuff to start
	recompositeCanvases();

	/**
	 * On mouse down, draw a line starting fresh
	 */
	function mousedown_handler(e) {
		var local = getLocalCoords(c, e);
		mouseDown = true;

		scratchLine(canvas.draw, local.x, local.y, true);
		recompositeCanvases();

		if (e.cancelable) { e.preventDefault(); }
		return false;
	};

	/**
	 * On mouse move, if mouse down, draw a line
	 *
	 * We do this on the window to smoothly handle mousing outside
	 * the canvas
	 */
	function mousemove_handler(e) {
		if (!mouseDown) { return true; }

		var local = getLocalCoords(c, e);

		scratchLine(canvas.draw, local.x, local.y, false);
		recompositeCanvases();

		if (e.cancelable) { e.preventDefault(); }
		return false;
	};

	/**
	 * On mouseup.  (Listens on window to catch out-of-canvas events.)
	 */
	function mouseup_handler(e) {
		if (mouseDown) {
			mouseDown = false;
			if (e.cancelable) { e.preventDefault(); }
			return false;
		}

		return true;
	};

	c.addEventListener('mousedown', mousedown_handler, false);
	c.addEventListener('touchstart', mousedown_handler, false);

	window.addEventListener('mousemove', mousemove_handler, false);
	window.addEventListener('touchmove', mousemove_handler, false);

	window.addEventListener('mouseup', mouseup_handler, false);
	window.addEventListener('touchend', mouseup_handler, false);
}

/**
 * Set up the DOM when loading is complete
 */
function loadingComplete() {
	var loading = document.getElementById('loading');
	var main = document.getElementById('main');

	loading.className = 'hidden';
	main.className = '';
}

/**
 * Handle loading of needed image resources
 */
function loadImages() {
	var loadCount = 0;
	var loadTotal = 0;
	var loadingIndicator;

	function imageLoaded(e) {
		loadCount++;

		if (loadCount >= loadTotal) {
			setupCanvases();
			loadingComplete();
		}
	}

	for (k in image) if (image.hasOwnProperty(k))
		loadTotal++;

	for (k in image) if (image.hasOwnProperty(k)) {
		image[k].img = document.createElement('img'); // image is global
		image[k].img.addEventListener('load', imageLoaded, false);
		image[k].img.src = image[k].url;
	}
}

/**
 * Handle page load
 */
window.addEventListener('load', function() {
	var resetButton = document.getElementById('resetbutton');

	loadImages();

	resetButton.addEventListener('click', function() {
			// clear the draw canvas
			canvas.draw.width = canvas.draw.width;
			recompositeCanvases()

			return false;
		}, false);

}, false);

})();
