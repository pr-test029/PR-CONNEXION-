
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { MapPin, Search, Navigation, Crosshair, Loader2 } from 'lucide-react';
import { Member } from '../types';

// Declaration for the global Leaflet object added via CDN
declare const L: any;

interface MemberMapProps {
  currentUser: Member | null;
}

export const MemberMap: React.FC<MemberMapProps> = ({ currentUser }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const layerGroupRef = useRef<any>(null);

  // Fetch real members on mount
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const members = await storageService.getAllMembers();
        if (Array.isArray(members)) {
          setAllMembers(members);
        } else {
          setAllMembers([]);
        }
      } catch (error) {
        console.error("Failed to fetch members", error);
        setAllMembers([]);
      }
    };
    fetchMembers();
  }, []);

  // Filter members based on search
  const filteredMembers = allMembers.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.location.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMember = allMembers.find(m => m.id === selectedMemberId);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Congo (Kinshasa area generally)
    const map = L.map(mapContainerRef.current).setView([-4.4419, 15.2663], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Layer group for markers to easily clear/update them
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when filteredMembers changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    // Clear existing markers
    layerGroupRef.current.clearLayers();
    markersRef.current = {};

    const createCustomIcon = (avatarUrl: string, isCurrentUser: boolean) => {
       const borderColor = isCurrentUser ? '#3b82f6' : '#ef4444'; // Blue for me, Red for others
       return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-image: url('${avatarUrl}'); width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 3px solid ${borderColor}; box-shadow: 0 4px 6px rgba(0,0,0,0.3); background-color: white;"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
    };

    // Add markers for filtered members
    filteredMembers.forEach((member) => {
      const isCurrentUser = currentUser?.id === member.id;
      const marker = L.marker([member.location.lat, member.location.lng], {
        icon: createCustomIcon(member.avatar, isCurrentUser),
        zIndexOffset: isCurrentUser ? 1000 : 0 // Put current user on top
      })
      .addTo(layerGroupRef.current)
      .bindPopup(`
        <div class="font-sans p-1 min-w-[150px]">
          <h3 class="font-bold text-sm ${isCurrentUser ? 'text-blue-600' : 'text-red-600'} mb-1">
            ${member.businessName} ${isCurrentUser ? '(Vous)' : ''}
          </h3>
          <p class="text-xs text-gray-800 font-medium">${member.name}</p>
          <p class="text-xs text-gray-500 mt-1 flex items-center">
            <span class="mr-1">📍</span> ${member.location.city}
          </p>
          <span class="inline-block mt-2 px-2 py-0.5 ${isCurrentUser ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-red-50 text-red-600 border-red-100'} text-[10px] rounded-full font-semibold border">
            ${member.sector}
          </span>
        </div>
      `);

      markersRef.current[member.id] = marker;

      marker.on('click', () => {
        setSelectedMemberId(member.id);
      });
    });

  }, [filteredMembers, currentUser]);

  // Handle FlyTo when selecting a member
  useEffect(() => {
    if (!selectedMemberId || !mapInstanceRef.current) return;

    const member = allMembers.find(m => m.id === selectedMemberId);
    if (member) {
      mapInstanceRef.current.flyTo(
        [member.location.lat, member.location.lng], 
        15, 
        { duration: 1.5, easeLinearity: 0.25 }
      );

      const marker = markersRef.current[member.id];
      if (marker) {
        setTimeout(() => marker.openPopup(), 500);
      }
    }
  }, [selectedMemberId, allMembers]);

  const handleLocateMe = () => {
    if (!currentUser) return;
    setIsLocating(true);

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      setIsLocating(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000, // 20 seconds timeout for better GPS lock
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // 1. Reverse Geocoding: Fetch readable address from coordinates
          // Using OpenStreetMap Nominatim API (free) to get city and road
          let detectedCity = currentUser.location.city;
          let detectedAddress = currentUser.location.address;

          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: {
                'User-Agent': 'PR-CONNEXION-Cluster-App/1.0'
              }
            });
            const data = await response.json();
            
            if (data && data.address) {
              // Extract City: Nominatim returns variable fields for "city" depending on location type
              detectedCity = data.address.city || data.address.town || data.address.village || data.address.municipality || detectedCity;
              
              // Extract Address: Use road name or display name parts
              const road = data.address.road || data.address.pedestrian;
              if (road) {
                detectedAddress = road;
              } else if (data.display_name) {
                detectedAddress = data.display_name.split(',')[0];
              }
            }
          } catch (geoError) {
            console.warn("Reverse geocoding failed, using coords only", geoError);
          }

          // 2. Update DB with new Coordinates AND new Address details
          await storageService.updateUserLocation(
            currentUser.id, 
            { lat: latitude, lng: longitude },
            { city: detectedCity, address: detectedAddress }
          );
          
          // 3. Update Local State immediately for UX
          setAllMembers(prev => prev.map(m => 
            m.id === currentUser.id 
              ? { 
                  ...m, 
                  location: { 
                    lat: latitude, 
                    lng: longitude,
                    city: detectedCity,
                    address: detectedAddress
                  } 
                }
              : m
          ));
          
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([latitude, longitude], 18);
            setSelectedMemberId(currentUser.id);
          }
        } catch (e) {
          console.error("Error updating location", e);
          alert("Erreur lors de l'enregistrement de votre position.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        
        let msg = "Impossible de récupérer votre position.";
        if (error && typeof error === 'object') {
           if (error.code === 1) msg = "Accès à la localisation refusé. Vérifiez vos permissions.";
           else if (error.code === 2) msg = "Position indisponible. Vérifiez que votre GPS est activé.";
           else if (error.code === 3) msg = "Délai d'attente dépassé.";
        }
        
        alert(msg);
        setIsLocating(false);
      },
      options
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar List */}
      <div className="w-full lg:w-1/3 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden max-h-[400px] lg:max-h-full transition-colors order-2 lg:order-1">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Membres ({filteredMembers.length})
          </h2>
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher nom, ville..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none dark:text-white"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredMembers.length > 0 ? (
            filteredMembers.slice(0, 50).map(member => (
              <div 
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start space-x-3 ${
                  selectedMemberId === member.id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 shadow-sm transform scale-[1.02]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="relative">
                   <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                   {currentUser?.id === member.id && (
                     <span className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white" title="C'est vous">
                       <div className="w-2 h-2 bg-white rounded-full"></div>
                     </span>
                   )}
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${selectedMemberId === member.id ? 'text-primary-800 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>
                    {member.businessName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{member.name}</p>
                  <div className="flex items-center mt-1 text-xs text-gray-400">
                    <MapPin className="w-3 h-3 mr-1" />
                    {member.location.city}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              Aucun membre trouvé.
            </div>
          )}
        </div>
      </div>

      {/* Real Map Visualization Area */}
      <div className="flex-1 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group h-[400px] lg:h-auto order-1 lg:order-2">
        {/* Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-gray-100 dark:bg-gray-900" />
        
        {/* Locate Me Button */}
        {currentUser && (
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute top-4 right-4 z-[1000] bg-white dark:bg-dark-card p-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center space-x-2 font-medium text-sm group"
            title="Mettre à jour ma position GPS exacte"
          >
             {isLocating ? (
               <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
             ) : (
               <Crosshair className="w-5 h-5 group-hover:text-primary-600" />
             )}
             <span className="hidden sm:inline">Ma Position</span>
          </button>
        )}

        {/* Details Overlay for Selected Member */}
        {selectedMember ? (
          <div className="absolute bottom-6 left-6 right-6 z-[1000] bg-white/95 dark:bg-dark-card/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-primary-100 dark:border-gray-700 flex justify-between items-center animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-center space-x-4 overflow-hidden">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2.5 rounded-lg shrink-0">
                <MapPin className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{selectedMember.businessName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedMember.location.address}</p>
              </div>
            </div>
            <button 
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 text-sm font-medium shadow-md ml-2 shrink-0"
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedMember.location.lat},${selectedMember.location.lng}`, '_blank')}
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">Itinéraire</span>
            </button>
          </div>
        ) : (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full px-6 py-2 shadow-md border border-gray-200 dark:border-gray-700 pointer-events-none">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center whitespace-nowrap">
              <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"></span>
              {filteredMembers.length} Membres localisées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
