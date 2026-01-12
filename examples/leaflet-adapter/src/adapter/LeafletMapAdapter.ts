import L from "leaflet";
import { type Map as MapLibreMap, LngLatBounds } from "maplibre-gl";

/**
 * Adapter to make a MapLibre map look like a Leaflet map.
 */
export class LeafletMapAdapter {
	private _map: MapLibreMap;
	// biome-ignore lint/suspicious/noExplicitAny: Adapter needs to handle loose Leaflet types
	private _layers: Record<string, any> = {};
	// biome-ignore lint/complexity/noBannedTypes: Leaflet event handlers are generic functions
	private _handlers: Record<string, Function[]> = {};
	// Leaflet interaction targets (used by addInteractiveTarget)
	// biome-ignore lint/suspicious/noExplicitAny: Leaflet internals are untyped
	public _targets: Record<string, any> = {};

	// Leaflet properties expected by plugins

	// Leaflet properties expected by plugins
	public options = {
		crs: L.CRS.EPSG3857,
		minZoom: 0,
		maxZoom: 22,
	};

	constructor(map: MapLibreMap) {
		this._map = map;
		// @ts-ignore
		this._map._leaflet_map = this;

		// Expose container as _container for plugins accessing it directly
		Object.defineProperty(this, "_container", {
			get: () => map.getContainer(),
			enumerable: true,
		});

		// Bridge events
		// Leaflet 'moveend' ~ MapLibre 'moveend'
		// Leaflet 'zoomend' ~ MapLibre 'zoomend'
		const forwardEvent = (mlName: string, lName: string) => {
			map.on(mlName, () => {
				// console.log(`LeafletMapAdapter: firing ${lName}`);
				this.fire(lName);
			});
		};

		forwardEvent("moveend", "moveend");
		forwardEvent("zoomend", "zoomend");
		forwardEvent("zoomstart", "zoomstart");
		forwardEvent("movestart", "movestart");

		// Map needs some Leaflet compatibility properties
		// @ts-ignore
		this._leaflet_id = "map-adapter";
		// @ts-ignore
		this._zoomAnimated = false;

		// Define _zoom as a getter to ensure it's always in sync with MapLibre
		// Define _zoom as a getter to ensure it's always in sync with MapLibre
		Object.defineProperty(this, "_zoom", {
			get: () => {
				const z = this._map.getZoom();
				// console.log("LeafletMapAdapter: GET _zoom =", z);
				return z;
			},
			enumerable: true,
			configurable: true,
		});

		// ... (skipping unchanged code if possible, but replace_file_content needs contiguous block)
		// Actually, I will make separate calls for _zoom and latLngToLayerPoint/getPanes to stay clean.

		map.on("move", () => {
			// console.log("LeafletMapAdapter: move", map.getCenter());
			try {
				this.fire("move");
				// biome-ignore lint/suspicious/noExplicitAny: Adapter needs to handle loose Leaflet types
				for (const layer of Object.values(this._layers) as any[]) {
					try {
						if (layer.update) {
							layer.update();
						} else if (layer._update) {
							layer._update();
						}
					} catch (_e) {
						// Ignore errors from individual layers during move to prevent freeze
						// console.warn("LeafletMapAdapter: Error updating layer", layer, e);
					}
				}
			} catch (e) {
				console.error("LeafletMapAdapter: Error in move handler", e);
			}
		});

		map.on("zoom", () => {
			// console.log("LeafletMapAdapter: zoom", map.getZoom());
			this.fire("zoom");
		});
	}

	// biome-ignore lint/suspicious/noExplicitAny: Leaflet layer type is loose
	addLayer(layer: any) {
		// console.log("LeafletMapAdapter: addLayer", layer);

		// Track layer
		const id = L.Util.stamp(layer);
		this._layers[id] = layer;

		// CRITICAL: Leaflet layers expect layer._map to be set to the map instance
		// so they can access map.getPane(), map.project(), etc.
		layer._map = this;
		layer._zoomAnimated = false;

		// Check if it's a marker/cluster
		if (layer.onAdd) {
			try {
				layer.onAdd(this);
			} catch (e) {
				console.error("LeafletMapAdapter: Error in layer.onAdd", e);
			}
		}
		return this;
	}

	// biome-ignore lint/suspicious/noExplicitAny: Leaflet layer type
	removeLayer(layer: any) {
		if (layer.onRemove) {
			layer.onRemove(this);
		}

		const id = L.Util.stamp(layer);
		delete this._layers[id];
		layer._map = undefined;

		return this;
	}

	// Capabilities
	getZoom() {
		return this._map.getZoom();
	}

	getBounds() {
		const b = this._map.getBounds();
		return L.latLngBounds(L.latLng(b.getSouth(), b.getWest()), L.latLng(b.getNorth(), b.getEast()));
	}

	getPixelBounds() {
		// Leaflet pixel bounds are absolute pixels since map center?
		// MapLibre uses project/unproject.
		// Leaflet.markercluster uses this to calculate clusters.
		// We might need to fake this.
		// Leaflet: "Returns the bounds of the current map view in projected pixel coordinates."
		// MapLibre: project() returns pixels relative to container top-left.

		// Helper:
		const center = this._map.getCenter();
		const zoom = this._map.getZoom();
		// Use Leaflet's projection to be consistent with the plugin?
		// If we use L.CRS.EPSG3857, we should match MapLibre (mostly).

		const size = this.getSize();
		const centerPoint = this.project(L.latLng(center.lat, center.lng), zoom);

		const halfX = size.x / 2;
		const halfY = size.y / 2;

		return L.bounds(centerPoint.subtract([halfX, halfY]), centerPoint.add([halfX, halfY]));
	}

	getSize() {
		const c = this._map.getCanvas();
		return L.point(c.width / window.devicePixelRatio, c.height / window.devicePixelRatio); // CSS pixels
	}

	// Projection
	latLngToLayerPoint(latlng: L.LatLngExpression) {
		const ll = L.latLng(latlng);
		const p = this._map.project([ll.lng, ll.lat]);
		// console.log(`LeafletMapAdapter: latLngToLayerPoint ${ll.lat},${ll.lng} => ${p.x},${p.y}`);
		return L.point(p.x, p.y);
	}

	layerPointToLatLng(point: L.PointExpression) {
		const p = L.point(point);
		const ll = this._map.unproject([p.x, p.y]);
		// console.log("LeafletMapAdapter: layerPointToLatLng", point, ll);
		return L.latLng(ll.lat, ll.lng);
	}

	project(latlng: L.LatLngExpression, zoom?: number) {
		const z = zoom ?? this._map.getZoom();
		const res = L.CRS.EPSG3857.latLngToPoint(L.latLng(latlng), z);
		// console.log(`LeafletMapAdapter: project ${latlng} z${z} => ${res}`);
		return res;
	}

	unproject(point: L.PointExpression, zoom?: number) {
		return L.CRS.EPSG3857.pointToLatLng(L.point(point), zoom ?? this._map.getZoom());
	}

	// Events
	// biome-ignore lint/suspicious/noExplicitAny: Context can be any
	// biome-ignore lint/complexity/noBannedTypes: Leaflet event system
	on(type: string, fn: Function, context?: any) {
		if (!this._handlers[type]) {
			this._handlers[type] = [];
		}
		this._handlers[type].push(fn.bind(context || this));
		return this;
	}

	// biome-ignore lint/complexity/noBannedTypes: Leaflet event system
	off(_type: string, _fn: Function) {
		// simplistic off
		return this;
	}

	// biome-ignore lint/suspicious/noExplicitAny: Data can be any
	fire(type: string, data?: any) {
		const handlers = this._handlers[type];
		if (handlers) {
			for (const h of handlers) {
				try {
					h(data);
				} catch (e) {
					console.error(`LeafletMapAdapter: Error in ${type} handler`, e);
				}
			}
		}
		return this;
	}

	// DOM Panes
	// Leaflet expects 'markerPane', 'overlayPane' etc.
	// We can return the map container or specific divs we invoke.
	getPanes() {
		if (!this._panes) {
			// console.log("LeafletMapAdapter: Creating panes");
			this._panes = {};
			const mapContainer = this._map.getContainer();

			// Create a dedicated container for Leaflet layers to ensure they sit above the canvas
			// and don't interfere with map interactions unless clicking a marker.
			const leafletContainer = document.createElement("div");
			leafletContainer.className = "leaflet-adapter-container";
			Object.assign(leafletContainer.style, {
				position: "absolute",
				top: "0",
				left: "0",
				width: "100%",
				height: "100%",
				zIndex: "2", // Above MapLibre canvas (usually z-index 1 or auto)
				pointerEvents: "none", // Let clicks pass through to map
				overflow: "hidden",
			});

			// Allow pointer events on children (markers)
			// Note: Leaflet markers usually handle this, but we ensure the container is passive.

			mapContainer.appendChild(leafletContainer);

			// Map all panes to this container for now
			this._panes.markerPane = leafletContainer;
			this._panes.overlayPane = leafletContainer;
			this._panes.popupPane = leafletContainer;
			this._panes.shadowPane = leafletContainer;
			this._panes.tilePane = leafletContainer;
			this._panes.zoomPane = leafletContainer;
			this._panes.mapPane = leafletContainer;
		}
		return this._panes;
	}

	// Leaflet internals expected by plugins
	get _mapPane() {
		return this.getPanes().mapPane;
	}

	// Used by some Leaflet animations
	_getMapPanePos() {
		// We always render at 0,0 relative to container
		return L.point(0, 0);
	}

	// internal shim for plugins
	// @ts-ignore
	_latLngToNewLayerPoint(latlng: L.LatLngExpression, zoom: number, center: L.LatLngExpression) {
		const start = L.CRS.EPSG3857.latLngToPoint(L.latLng(center), zoom);
		// We need to account for the center of the view?
		// simple projection:
		// top left of the map at requested zoom/center
		const size = this.getSize();
		const topLeft = start.subtract(size.divideBy(2));

		const point = L.CRS.EPSG3857.latLngToPoint(L.latLng(latlng), zoom);
		return point.subtract(topLeft);
	}

	// biome-ignore lint/suspicious/noExplicitAny: Internal panes
	private _panes: any;

	getPane(name: string) {
		return this.getPanes()[name];
	}

	// Minimal set for markercluster
	getMaxZoom() {
		return this._map.getMaxZoom();
	}
	getMinZoom() {
		return this._map.getMinZoom();
	}

	// Accessibility / Focus
	// biome-ignore lint/suspicious/noExplicitAny: Options
	panInside(latlng: L.LatLngExpression, _options?: any) {
		// Minimal implementation: just pan to the location
		const ll = L.latLng(latlng);
		this._map.panTo([ll.lng, ll.lat]);
	}

	// View control
	// biome-ignore lint/suspicious/noExplicitAny: Options
	fitBounds(bounds: L.LatLngBoundsExpression, options?: any) {
		// @ts-ignore - Leaflet types are tricky with bounds expression
		const b = L.latLngBounds(bounds);

		const sw = b.getSouthWest();
		const ne = b.getNorthEast();

		// Convert options
		// biome-ignore lint/suspicious/noExplicitAny: MapLibre options
		const mlOptions: any = {};
		if (options?.padding) {
			mlOptions.padding = options.padding;
		}
		if (options?.maxZoom) {
			mlOptions.maxZoom = options.maxZoom;
		}
		if (options?.animate === false) {
			mlOptions.animate = false;
		}

		this._map.fitBounds(new LngLatBounds([sw.lng, sw.lat], [ne.lng, ne.lat]), mlOptions);
		return this;
	}

	setZoom(zoom: number) {
		this._map.setZoom(zoom);
		return this;
	}

	setView(center: L.LatLngExpression, zoom: number) {
		const ll = L.latLng(center);
		this._map.jumpTo({
			center: [ll.lng, ll.lat],
			zoom: zoom,
		});
		return this;
	}

	stop() {
		this._map.stop();
		return this;
	}
}
