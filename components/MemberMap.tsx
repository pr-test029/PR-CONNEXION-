
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService'; // Using real storage
import { MapPin, Search, Navigation } from 'lucide-react';
import { Member } from '../types';

// Declaration for the global Leaflet object added via CDN
declare const L: any;

export const MemberMap: React.FC = () => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allMembers, setAllMembers] = useState<Member[]>([]);
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

    const createCustomIcon = (avatarUrl: string) => {
       return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-image: url('${avatarUrl}'); width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 3px solid #ef4444; box-shadow: 0 4px 6px rgba(0,0,0,0.3); background-color: white;"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });
    };

    // Add markers for filtered members
    filteredMembers.forEach((member) => {
      const marker = L.marker([member.location.lat, member.location.lng], {
        icon: createCustomIcon(member.avatar)
      })
      .addTo(layerGroupRef.current)
      .bindPopup(`
        <div class="font-sans p-1 min-w-[150px]">
          <h3 class="font-bold text-sm text-red-600 mb-1">${member.businessName}</h3>
          <p class="text-xs text-gray-800 font-medium">${member.name}</p>
          <p class="text-xs text-gray-500 mt-1 flex items-center">
            <span class="mr-1">📍</span> ${member.location.city}
          </p>
          <span class="inline-block mt-2 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full font-semibold border border-red-100">
            ${member.sector}
          </span>
        </div>
      `);

      markersRef.current[member.id] = marker;

      marker.on('click', () => {
        setSelectedMemberId(member.id);
      });
    });

  }, [filteredMembers]);

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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar List - Limited to 5 items visible logic */}
      <div className="w-full lg:w-1/3 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden max-h-[400px] lg:max-h-full transition-colors">
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
            // LIMITATION: We slice to 5 to satisfy the request "limited to 5 members" in the list view
            // unless user is filtering
            filteredMembers.slice(0, 5).map(member => (
              <div 
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start space-x-3 ${
                  selectedMemberId === member.id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 shadow-sm transform scale-[1.02]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
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
          
          {/* Hint about hidden members if more than 5 and not searching */}
          {filteredMembers.length > 5 && (
            <div className="p-2 text-center">
               <span className="text-xs text-gray-400 italic">
                 + {filteredMembers.length - 5} autres membres sur la carte...
               </span>
            </div>
          )}
        </div>
      </div>

      {/* Real Map Visualization Area */}
      <div className="flex-1 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group h-[400px] lg:h-auto">
        {/* Map Container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-gray-100 dark:bg-gray-900" />

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
