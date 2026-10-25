( function () {
	'use strict';

	var root = document.documentElement;
	root.classList.add( 'js' );

	var reduced = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	var T = window.ntxI18n || {};

	/* Language dropdown. A manual choice is remembered so country detection never overrides it. */
	var langsw = document.querySelector( '[data-langsw]' );
	if ( langsw ) {
		var langBtn = langsw.querySelector( '.ntx-langsw__btn' );
		var closeLang = function () {
			langsw.classList.remove( 'is-open' );
			langBtn.setAttribute( 'aria-expanded', 'false' );
		};
		langBtn.addEventListener( 'click', function ( e ) {
			e.stopPropagation();
			var open = ! langsw.classList.contains( 'is-open' );
			langsw.classList.toggle( 'is-open', open );
			langBtn.setAttribute( 'aria-expanded', String( open ) );
		} );
		document.addEventListener( 'click', function ( e ) {
			if ( ! langsw.contains( e.target ) ) { closeLang(); }
		} );
		document.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) { closeLang(); }
		} );
		langsw.querySelectorAll( 'a[data-lang]' ).forEach( function ( link ) {
			link.addEventListener( 'click', function () {
				document.cookie = 'ntx_lang=' + link.getAttribute( 'data-lang' ) + '; path=/; max-age=31536000; SameSite=Lax' + ( window.location.protocol === 'https:' ? '; Secure' : '' );
			} );
		} );
	}

	/* Header: stronger bar after scrolling -------------------------------- */
	var header = document.querySelector( '[data-header]' );
	if ( header ) {
		var onScroll = function () {
			header.classList.toggle( 'is-scrolled', window.scrollY > 8 );
		};
		onScroll();
		window.addEventListener( 'scroll', onScroll, { passive: true } );
	}

	/* Mobile menu --------------------------------------------------------- */
	var burger = document.querySelector( '[data-burger]' );
	var nav = document.getElementById( 'ntx-nav' );
	if ( burger && nav ) {
		var setMenu = function ( open ) {
			burger.setAttribute( 'aria-expanded', String( open ) );
			nav.classList.toggle( 'is-open', open );
		};
		burger.addEventListener( 'click', function () {
			setMenu( burger.getAttribute( 'aria-expanded' ) !== 'true' );
		} );
		nav.addEventListener( 'click', function ( e ) {
			if ( e.target.closest( 'a' ) ) { setMenu( false ); }
		} );
		document.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' ) { setMenu( false ); }
		} );
	}

	/* Scroll reveal ------------------------------------------------------- */
	var revealEls = document.querySelectorAll( '[data-reveal]' );
	if ( 'IntersectionObserver' in window && ! reduced ) {
		var io = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( entry.isIntersecting ) {
					entry.target.classList.add( 'is-visible' );
					io.unobserve( entry.target );
				}
			} );
		}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' } );
		revealEls.forEach( function ( el ) { io.observe( el ); } );
	} else {
		revealEls.forEach( function ( el ) { el.classList.add( 'is-visible' ); } );
	}

	/* Stat counters ------------------------------------------------------- */
	var counters = document.querySelectorAll( '[data-count]' );
	if ( counters.length && 'IntersectionObserver' in window && ! reduced ) {
		var co = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( entry ) {
				if ( ! entry.isIntersecting ) { return; }
				co.unobserve( entry.target );

				var el = entry.target;
				var target = parseInt( el.getAttribute( 'data-count' ), 10 );
				var start = null;
				var duration = 1400;

				var tick = function ( ts ) {
					if ( start === null ) { start = ts; }
					var p = Math.min( ( ts - start ) / duration, 1 );
					el.textContent = Math.round( target * ( 1 - Math.pow( 1 - p, 3 ) ) );
					if ( p < 1 ) { requestAnimationFrame( tick ); }
				};
				el.textContent = '0';
				requestAnimationFrame( tick );
			} );
		}, { threshold: 0.6 } );
		counters.forEach( function ( el ) { co.observe( el ); } );
	}

	/* Pricing toggle ------------------------------------------------------ */
	var billing = document.querySelector( '[data-billing]' );
	if ( billing ) {
		var buttons = billing.querySelectorAll( 'button' );
		var prices = document.querySelectorAll( '[data-price]' );
		var units = document.querySelectorAll( '[data-unit]' );

		var setPeriod = function ( period ) {
			buttons.forEach( function ( b ) {
				var active = b.getAttribute( 'data-period' ) === period;
				b.classList.toggle( 'is-active', active );
				b.setAttribute( 'aria-pressed', String( active ) );
			} );
			prices.forEach( function ( p ) {
				p.textContent = ( p.getAttribute( 'data-currency' ) || '' ) + Number( p.getAttribute( 'data-' + period ) ).toLocaleString( 'en-US' );
			} );
			units.forEach( function ( u ) {
				u.textContent = u.getAttribute( 'data-' + period ) || '';
			} );
		};

		buttons.forEach( function ( b ) {
			b.addEventListener( 'click', function () { setPeriod( b.getAttribute( 'data-period' ) ); } );
		} );
	}

	/* Video -------------------------------------------------------------------
	 * data-video-src + data-video-provider (youtube | vimeo | file | other)
	 *  - default: click the play button to play with sound
	 *  - data-video-autoplay: starts muted when visible, click pauses / resumes, sound button
	 * ------------------------------------------------------------------------ */
	var ICON_PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M8 5.5v13l10-6.5z"/></svg>';
	var ICON_SOUND = '<svg class="ntx-i-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>'
		+ '<svg class="ntx-i-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>';

	function ytId( src ) {
		var m = src.match( /\/embed\/([\w-]+)/ );
		return m ? m[ 1 ] : '';
	}

	/** Build the <video> or <iframe>. o: { autoplay, muted, loop, controls } */
	function buildPlayer( provider, src, o ) {
		var el, url;

		if ( provider === 'file' ) {
			el = document.createElement( 'video' );
			el.src = src;
			el.controls = o.controls;
			el.autoplay = o.autoplay;
			el.muted = o.muted;
			el.loop = o.loop;
			el.playsInline = true;
			el.setAttribute( 'playsinline', '' );
			return el;
		}

		if ( provider === 'youtube' ) {
			var id = ytId( src );
			url = 'https://www.youtube.com/embed/' + id + '?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&enablejsapi=1'
				+ '&origin=' + encodeURIComponent( window.location.origin )
				+ '&autoplay=' + ( o.autoplay ? 1 : 0 ) + '&mute=' + ( o.muted ? 1 : 0 )
				+ '&controls=' + ( o.controls ? 1 : 0 ) + ( o.loop ? '&loop=1&playlist=' + id : '' );
		} else if ( provider === 'vimeo' ) {
			url = src + ( src.indexOf( '?' ) > -1 ? '&' : '?' )
				+ 'autoplay=' + ( o.autoplay ? 1 : 0 ) + '&muted=' + ( o.muted ? 1 : 0 )
				+ '&loop=' + ( o.loop ? 1 : 0 ) + '&controls=' + ( o.controls ? 1 : 0 ) + '&playsinline=1';
		} else {
			url = src + ( src.indexOf( '?' ) > -1 ? '&' : '?' ) + 'autoplay=1';
		}

		el = document.createElement( 'iframe' );
		el.src = url;
		el.title = 'Video player';
		el.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
		el.referrerPolicy = 'strict-origin-when-cross-origin';
		el.allowFullscreen = true;
		return el;
	}

	/** Send play / pause / mute commands to whichever player is mounted. */
	function command( player, provider, name ) {
		if ( provider === 'file' ) {
			if ( name === 'play' ) { player.play(); }
			if ( name === 'pause' ) { player.pause(); }
			if ( name === 'mute' ) { player.muted = true; }
			if ( name === 'unmute' ) { player.muted = false; if ( player.volume === 0 ) { player.volume = 1; } }
			return;
		}
		var win = player.contentWindow;
		if ( ! win ) { return; }

		if ( provider === 'youtube' ) {
			var fn = { play: 'playVideo', pause: 'pauseVideo', mute: 'mute', unmute: 'unMute' }[ name ];
			win.postMessage( JSON.stringify( { event: 'command', func: fn, args: [] } ), '*' );
		} else if ( provider === 'vimeo' ) {
			var msg = { play: { method: 'play' }, pause: { method: 'pause' }, mute: { method: 'setVolume', value: 0 }, unmute: { method: 'setVolume', value: 1 } }[ name ];
			win.postMessage( JSON.stringify( msg ), '*' );
		}
	}

	document.querySelectorAll( '[data-video-src]' ).forEach( function ( box ) {
		var src = box.getAttribute( 'data-video-src' );
		var provider = box.getAttribute( 'data-video-provider' ) || 'other';
		var loop = box.getAttribute( 'data-video-loop' ) === '1';
		var auto = box.getAttribute( 'data-video-autoplay' ) === '1' && ! reduced;
		var playBtn = box.querySelector( '.ntx-play' );

		/* Click to play, with sound (testimonials, or autoplay switched off) */
		if ( ! auto ) {
			if ( ! playBtn ) { return; }
			playBtn.addEventListener( 'click', function () {
				var player = buildPlayer( provider, src, { autoplay: true, muted: false, loop: false, controls: true } );
				playBtn.remove();
				box.appendChild( player );
			} );
			return;
		}

		/* Autoplay muted, click to pause / resume */
		if ( playBtn ) { playBtn.remove(); }
		var controllable = provider === 'file' || provider === 'youtube' || provider === 'vimeo';
		var started = false;

		function start() {
			if ( started ) { return; }
			started = true;

			var player = buildPlayer( provider, src, { autoplay: true, muted: true, loop: loop, controls: ! controllable } );
			player.style.opacity = '0';
			player.style.transition = 'opacity .5s';
			var reveal = function () { player.style.opacity = '1'; };
			player.addEventListener( provider === 'file' ? 'playing' : 'load', reveal );
			box.appendChild( player );
			box.classList.add( 'is-muted' );

			if ( ! controllable ) { reveal(); return; }

			var state = { playing: true, muted: true };

			var toggle = document.createElement( 'button' );
			toggle.type = 'button';
			toggle.className = 'ntx-video-toggle';
			toggle.setAttribute( 'aria-label', T.pause || 'Pause video' );

			var icon = document.createElement( 'span' );
			icon.className = 'ntx-video-icon';
			icon.innerHTML = ICON_PLAY;

			var sound = document.createElement( 'button' );
			sound.type = 'button';
			sound.className = 'ntx-video-sound';
			sound.setAttribute( 'aria-label', T.soundOn || 'Turn sound on' );
			sound.innerHTML = ICON_SOUND;

			box.appendChild( toggle );
			box.appendChild( icon );
			box.appendChild( sound );

			toggle.addEventListener( 'click', function () {
				state.playing = ! state.playing;
				command( player, provider, state.playing ? 'play' : 'pause' );
				box.classList.toggle( 'is-paused', ! state.playing );
				toggle.setAttribute( 'aria-label', state.playing ? ( T.pause || 'Pause video' ) : ( T.play || 'Play video' ) );
			} );

			sound.addEventListener( 'click', function ( e ) {
				e.stopPropagation();
				state.muted = ! state.muted;
				command( player, provider, state.muted ? 'mute' : 'unmute' );
				box.classList.toggle( 'is-muted', state.muted );
				sound.setAttribute( 'aria-label', state.muted ? ( T.soundOn || 'Turn sound on' ) : ( T.soundOff || 'Turn sound off' ) );
			} );

			// YouTube only answers commands after it has been told we are listening.
			if ( provider === 'youtube' ) {
				player.addEventListener( 'load', function () {
					player.contentWindow.postMessage( JSON.stringify( { event: 'listening', id: 1 } ), '*' );
				} );
			}
		}

		if ( 'IntersectionObserver' in window ) {
			var vo = new IntersectionObserver( function ( entries ) {
				if ( entries[ 0 ].isIntersecting ) { vo.disconnect(); start(); }
			}, { threshold: 0.2 } );
			vo.observe( box );
		} else {
			start();
		}
	} );
} )();
