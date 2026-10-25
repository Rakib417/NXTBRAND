/**
 * NXT animated backgrounds.
 * Each .ntx-bg[data-effect] holds a <canvas> that is drawn by one of the effects below.
 * Config comes from data attributes (set in Customizer): effect, color, intensity, speed, interactive.
 */
( function () {
	'use strict';

	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var TAU = Math.PI * 2;

	function rand( a, b ) { return a + Math.random() * ( b - a ); }
	function clamp( v, a, b ) { return Math.max( a, Math.min( b, v ) ); }

	function hexToRgb( hex ) {
		hex = String( hex || '#e84b27' ).replace( '#', '' );
		if ( hex.length === 3 ) { hex = hex.replace( /(.)/g, '$1$1' ); }
		var n = parseInt( hex, 16 );
		return [ ( n >> 16 ) & 255, ( n >> 8 ) & 255, n & 255 ];
	}

	function rgba( c, a ) {
		return 'rgba(' + c[ 0 ] + ',' + c[ 1 ] + ',' + c[ 2 ] + ',' + clamp( a, 0, 1 ).toFixed( 3 ) + ')';
	}

	/** Soft radial blob. */
	function blob( ctx, x, y, r, color, alpha ) {
		var g = ctx.createRadialGradient( x, y, 0, x, y, r );
		g.addColorStop( 0, rgba( color, alpha ) );
		g.addColorStop( 0.5, rgba( color, alpha * 0.35 ) );
		g.addColorStop( 1, rgba( color, 0 ) );
		ctx.fillStyle = g;
		ctx.fillRect( x - r, y - r, r * 2, r * 2 );
	}

	function Background( el ) {
		var canvas = el.querySelector( 'canvas' );
		if ( ! canvas ) { return; }

		var ctx = canvas.getContext( '2d' );
		var host = el.parentElement;
		var effect = el.getAttribute( 'data-effect' ) || 'cosmos';
		var accent = hexToRgb( el.getAttribute( 'data-color' ) );
		var intensity = parseFloat( el.getAttribute( 'data-intensity' ) ) || 1;
		var speed = parseFloat( el.getAttribute( 'data-speed' ) ) || 1;
		var interactive = el.getAttribute( 'data-interactive' ) !== '0' && ! reduced;

		var w = 0, h = 0, time = 0, last = 0, raf = 0;
		var onScreen = false;
		var mouse = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, active: false };
		var stars = [], parts = [], shooters = [];
		var nextShot = rand( 1.5, 3 );

		var warm = [ 255, 205, 170 ];
		var cool = [ 150, 155, 175 ];

		/* Sizing ----------------------------------------------------------- */
		function resize() {
			var dpr = Math.min( window.devicePixelRatio || 1, 2 );
			w = el.clientWidth;
			h = el.clientHeight;
			if ( ! w || ! h ) { return; }
			canvas.width = Math.round( w * dpr );
			canvas.height = Math.round( h * dpr );
			ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );
			build();
			if ( reduced || ! onScreen ) { draw( 0 ); }
		}

		function build() {
			stars = [];
			parts = [];

			var starCount = effect === 'cosmos'
				? clamp( Math.round( w * h / 3000 ), 90, 620 )
				: ( effect === 'particles' ? 0 : clamp( Math.round( w * h / 16000 ), 25, 90 ) );

			for ( var i = 0; i < starCount; i++ ) {
				var z = Math.pow( Math.random(), 1.6 ) * 0.9 + 0.1; // most stars are far (small, slow)
				stars.push( {
					x: Math.random() * w, y: Math.random() * h, z: z,
					r: z * rand( 0.55, 2 ), a: rand( 0.45, 1 ),
					tw: rand( 0.6, 2.8 ), ph: rand( 0, TAU ),
					c: Math.random() < 0.14 ? warm : ( Math.random() < 0.2 ? cool : null ),
				} );
			}

			if ( effect === 'particles' ) {
				var n = clamp( Math.round( w * h / 12000 ), 40, 140 );
				for ( var p = 0; p < n; p++ ) {
					var ang = rand( 0, TAU ), v = rand( 8, 26 );
					parts.push( { x: Math.random() * w, y: Math.random() * h, vx: Math.cos( ang ) * v, vy: Math.sin( ang ) * v, r: rand( 0.8, 2 ), hot: Math.random() < 0.16 } );
				}
			}
		}

		/* Effects ---------------------------------------------------------- */
		function drawStars( dt ) {
			var mx = ( mouse.x - 0.5 ), my = ( mouse.y - 0.5 );
			for ( var i = 0; i < stars.length; i++ ) {
				var s = stars[ i ];
				var x = s.x + mx * 46 * s.z + time * 3.5 * s.z;
				var y = s.y + my * 28 * s.z - time * 1.5 * s.z;
				x = ( ( x % w ) + w ) % w;
				y = ( ( y % h ) + h ) % h;

				var tw = 0.6 + 0.4 * Math.sin( time * s.tw + s.ph );
				var a = s.a * tw * Math.min( 1, intensity + 0.2 );
				var col = s.c || [ 255, 255, 255 ];

				if ( s.r > 1.2 ) { // halo + diffraction spikes on the brightest stars
					blob( ctx, x, y, s.r * 7, s.c || accent, a * 0.3 );
					if ( s.r > 1.5 ) {
						var L = s.r * 8 * tw;
						ctx.strokeStyle = rgba( col, a * 0.55 );
						ctx.lineWidth = 0.7;
						ctx.beginPath();
						ctx.moveTo( x - L, y ); ctx.lineTo( x + L, y );
						ctx.moveTo( x, y - L ); ctx.lineTo( x, y + L );
						ctx.stroke();
					}
				}
				ctx.fillStyle = rgba( col, a );
				ctx.beginPath();
				ctx.arc( x, y, s.r, 0, TAU );
				ctx.fill();
			}
		}

		/** Soft glow that follows the cursor (cosmos + aurora). */
		function drawSpotlight() {
			if ( interactive && mouse.active ) {
				blob( ctx, mouse.x * w, mouse.y * h, 300, accent, 0.13 * intensity );
			}
		}

		function drawShooters( dt ) {
			nextShot -= dt;
			if ( nextShot <= 0 && ! reduced ) {
				var ang = rand( 0.45, 0.8 ); // radians below horizontal, heading down-left
				shooters.push( { x: rand( w * 0.25, w * 1.0 ), y: rand( -20, h * 0.35 ), vx: -Math.cos( ang ), vy: Math.sin( ang ), life: 0, max: rand( 0.7, 1.2 ), len: rand( 110, 200 ) } );
				nextShot = rand( 3, 7 );
			}
			for ( var i = shooters.length - 1; i >= 0; i-- ) {
				var s = shooters[ i ];
				s.life += dt;
				var p = s.life / s.max;
				if ( p >= 1 ) { shooters.splice( i, 1 ); continue; }

				var d = 900 * s.life;
				var hx = s.x + s.vx * d, hy = s.y + s.vy * d;
				var tx = hx - s.vx * s.len, ty = hy - s.vy * s.len;
				var fade = Math.sin( p * Math.PI );
				var g = ctx.createLinearGradient( hx, hy, tx, ty );
				g.addColorStop( 0, 'rgba(255,255,255,' + ( 0.95 * fade ).toFixed( 3 ) + ')' );
				g.addColorStop( 0.25, rgba( accent, 0.5 * fade ) );
				g.addColorStop( 1, rgba( accent, 0 ) );
				ctx.strokeStyle = g;
				ctx.lineWidth = 1.6;
				ctx.lineCap = 'round';
				ctx.beginPath();
				ctx.moveTo( hx, hy );
				ctx.lineTo( tx, ty );
				ctx.stroke();
			}
		}

		function cosmos( dt ) {
			ctx.globalCompositeOperation = 'lighter';
			var R = Math.max( w, h );
			var t = time * 0.12;
			var breathe = 0.85 + 0.15 * Math.sin( time * 0.5 );

			// Smoky grey-white nebula wisps (the "space" look) with a warm accent glow on top
			blob( ctx, w * 0.5 + Math.sin( t ) * w * 0.06, -h * 0.08, R * 0.5, accent, 0.20 * intensity * breathe );
			blob( ctx, w * 0.16 + Math.sin( t * 1.3 + 1 ) * w * 0.08, h * 0.34 + Math.cos( t ) * h * 0.06, R * 0.46, cool, 0.13 * intensity );
			blob( ctx, w * 0.84 + Math.cos( t * 1.1 ) * w * 0.07, h * 0.26 + Math.sin( t * 0.9 ) * h * 0.07, R * 0.42, cool, 0.11 * intensity );
			blob( ctx, w * 0.5 + Math.cos( t * 0.8 ) * w * 0.18, h * 0.5 + Math.sin( t * 0.6 ) * h * 0.05, R * 0.34, [ 190, 192, 205 ], 0.07 * intensity );
			blob( ctx, w * 0.9 + Math.sin( t * 0.9 ) * w * 0.04, h * 0.18, R * 0.3, accent, 0.10 * intensity );
			blob( ctx, w * 0.5 + Math.cos( t * 0.7 ) * w * 0.15, h * 0.92, R * 0.5, [ 110, 95, 165 ], 0.06 * intensity );

			drawStars( dt );
			drawShooters( dt );
			drawSpotlight();
			ctx.globalCompositeOperation = 'source-over';
		}

		function aurora( dt ) {
			ctx.globalCompositeOperation = 'lighter';
			var R = Math.max( w, h );
			var t = time * 0.18;
			var orbs = [
				{ c: accent, a: 0.34, r: 0.5, fx: 1.0, fy: 0.8, ph: 0 },
				{ c: [ 255, 150, 60 ], a: 0.22, r: 0.42, fx: 0.7, fy: 1.1, ph: 1.7 },
				{ c: [ 200, 40, 70 ], a: 0.22, r: 0.46, fx: 0.9, fy: 0.6, ph: 3.1 },
				{ c: warm, a: 0.10, r: 0.34, fx: 1.3, fy: 0.9, ph: 4.4 },
				{ c: [ 110, 100, 190 ], a: 0.14, r: 0.44, fx: 0.6, fy: 1.2, ph: 5.5 },
			];
			for ( var i = 0; i < orbs.length; i++ ) {
				var o = orbs[ i ];
				var x = w * ( 0.5 + 0.42 * Math.sin( t * o.fx + o.ph ) );
				var y = h * ( 0.35 + 0.32 * Math.cos( t * o.fy + o.ph * 1.3 ) );
				blob( ctx, x, y, R * o.r, o.c, o.a * intensity );
			}
			drawStars( dt );
			drawSpotlight();
			ctx.globalCompositeOperation = 'source-over';
		}

		function particles( dt ) {
			ctx.globalCompositeOperation = 'lighter';
			blob( ctx, w * 0.5, -h * 0.1, Math.max( w, h ) * 0.55, accent, 0.18 * intensity );
			ctx.globalCompositeOperation = 'source-over';

			var link = 135;
			var mx = mouse.x * w, my = mouse.y * h;
			var i, j, p, q, dx, dy, d, a;

			for ( i = 0; i < parts.length; i++ ) {
				p = parts[ i ];
				p.x += p.vx * dt; p.y += p.vy * dt;
				if ( p.x < -10 ) { p.x = w + 10; } else if ( p.x > w + 10 ) { p.x = -10; }
				if ( p.y < -10 ) { p.y = h + 10; } else if ( p.y > h + 10 ) { p.y = -10; }

				if ( interactive && mouse.active ) {
					dx = mx - p.x; dy = my - p.y; d = Math.sqrt( dx * dx + dy * dy );
					if ( d < 190 && d > 1 ) { p.x += ( dx / d ) * 18 * dt; p.y += ( dy / d ) * 18 * dt; }
				}
			}

			ctx.lineWidth = 1;
			for ( i = 0; i < parts.length; i++ ) {
				p = parts[ i ];
				for ( j = i + 1; j < parts.length; j++ ) {
					q = parts[ j ];
					dx = p.x - q.x; dy = p.y - q.y; d = dx * dx + dy * dy;
					if ( d < link * link ) {
						a = ( 1 - Math.sqrt( d ) / link ) * 0.28 * intensity;
						ctx.strokeStyle = ( p.hot || q.hot ) ? rgba( accent, a * 1.6 ) : 'rgba(255,255,255,' + a.toFixed( 3 ) + ')';
						ctx.beginPath(); ctx.moveTo( p.x, p.y ); ctx.lineTo( q.x, q.y ); ctx.stroke();
					}
				}
				if ( interactive && mouse.active ) {
					dx = p.x - mx; dy = p.y - my; d = Math.sqrt( dx * dx + dy * dy );
					if ( d < 190 ) {
						ctx.strokeStyle = rgba( accent, ( 1 - d / 190 ) * 0.5 * intensity );
						ctx.beginPath(); ctx.moveTo( p.x, p.y ); ctx.lineTo( mx, my ); ctx.stroke();
					}
				}
			}

			for ( i = 0; i < parts.length; i++ ) {
				p = parts[ i ];
				ctx.fillStyle = p.hot ? rgba( accent, 0.95 ) : 'rgba(255,255,255,0.65)';
				ctx.beginPath(); ctx.arc( p.x, p.y, p.r, 0, TAU ); ctx.fill();
			}
		}

		function grid( dt ) {
			var horizon = Math.min( h * 0.4, 520 );
			var cx = w * ( 0.5 + ( mouse.x - 0.5 ) * 0.1 );

			ctx.globalCompositeOperation = 'lighter';
			blob( ctx, cx, horizon, Math.max( w, h ) * 0.55, accent, 0.30 * intensity );
			blob( ctx, w * 0.5, -h * 0.1, Math.max( w, h ) * 0.5, accent, 0.10 * intensity );
			ctx.globalCompositeOperation = 'source-over';

			drawStars( dt );

			// Horizontal lines rushing toward the viewer
			var rows = 16, travel = ( time * 0.35 ) % 1;
			ctx.lineWidth = 1;
			for ( var i = 0; i < rows; i++ ) {
				var z = ( i + travel ) / rows;
				var y = horizon + ( h - horizon ) * z * z;
				ctx.strokeStyle = rgba( accent, ( 0.14 + z * 0.6 ) * intensity );
				ctx.beginPath(); ctx.moveTo( 0, y ); ctx.lineTo( w, y ); ctx.stroke();
			}

			// Vertical lines converging on the vanishing point
			var cols = 22, step = w * 0.11;
			for ( var k = -cols / 2; k <= cols / 2; k++ ) {
				var bx = cx + k * step * 1.9;
				var tx = cx + k * step * 0.14;
				var g = ctx.createLinearGradient( 0, horizon, 0, h );
				g.addColorStop( 0, rgba( accent, 0 ) );
				g.addColorStop( 1, rgba( accent, 0.45 * intensity ) );
				ctx.strokeStyle = g;
				ctx.beginPath(); ctx.moveTo( tx, horizon ); ctx.lineTo( bx, h ); ctx.stroke();
			}

			// Soften the horizon
			var fade = ctx.createLinearGradient( 0, horizon - 40, 0, horizon + h * 0.14 );
			fade.addColorStop( 0, 'rgba(10,10,10,0)' );
			fade.addColorStop( 0.45, 'rgba(10,10,10,0.9)' );
			fade.addColorStop( 1, 'rgba(10,10,10,0)' );
			ctx.fillStyle = fade;
			ctx.fillRect( 0, horizon - 40, w, h * 0.14 + 40 );
		}

		/* Loop ------------------------------------------------------------- */
		function draw( dt ) {
			ctx.clearRect( 0, 0, w, h );
			if ( effect === 'aurora' ) { aurora( dt ); }
			else if ( effect === 'particles' ) { particles( dt ); }
			else if ( effect === 'grid' ) { grid( dt ); }
			else { cosmos( dt ); }
		}

		function tick( ts ) {
			if ( ! onScreen || document.hidden ) { raf = 0; return; }
			var dt = Math.min( ( ts - last ) / 1000, 0.05 );
			last = ts;
			time += dt * speed;

			mouse.x += ( mouse.tx - mouse.x ) * 0.05;
			mouse.y += ( mouse.ty - mouse.y ) * 0.05;

			draw( dt * speed );
			raf = requestAnimationFrame( tick );
		}

		function start() {
			if ( reduced || raf ) { return; }
			last = performance.now();
			raf = requestAnimationFrame( tick );
		}

		/* Wiring ----------------------------------------------------------- */
		if ( 'ResizeObserver' in window ) {
			new ResizeObserver( resize ).observe( el );
		} else {
			window.addEventListener( 'resize', resize );
		}

		if ( 'IntersectionObserver' in window ) {
			new IntersectionObserver( function ( entries ) {
				onScreen = entries[ 0 ].isIntersecting;
				if ( onScreen ) { start(); }
			} ).observe( el );
		} else {
			onScreen = true;
			start();
		}

		document.addEventListener( 'visibilitychange', function () { if ( ! document.hidden && onScreen ) { start(); } } );

		if ( interactive && host ) {
			host.addEventListener( 'pointermove', function ( e ) {
				var r = host.getBoundingClientRect();
				mouse.tx = clamp( ( e.clientX - r.left ) / r.width, 0, 1 );
				mouse.ty = clamp( ( e.clientY - r.top ) / r.height, 0, 1 );
				mouse.active = true;
			}, { passive: true } );
			host.addEventListener( 'pointerleave', function () {
				mouse.tx = 0.5; mouse.ty = 0.3; mouse.active = false;
			} );
		}

		resize();
	}

	document.querySelectorAll( '.ntx-bg' ).forEach( Background );
} )();
