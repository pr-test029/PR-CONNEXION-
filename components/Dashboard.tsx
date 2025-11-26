import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Award, TrendingUp, MessageCircle, Target, Calendar, ArrowUpRight, Zap } from 'lucide-react';
import { storageService } from '../services/storageService';
import { CLUSTER_INFO } from '../constants';
import { StrategicGoal, Member, Post } from '../types';

export const Dashboard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setMembers(await storageService.getAllMembers());
      setPosts(await storageService.getPosts());
      setGoals(storageService.getStrategicGoals());
    };
    fetchData();
  }, []);

  // --- CALCULATION OF REAL METRICS ---

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const certifiedMembers = members.filter(m => m.status === 'Certifiée').length;
    const successPosts = posts.filter(p => p.type === 'Succès').length;
    const totalInteractions = posts.reduce((acc, post) => acc + post.likes + post.comments, 0);

    return {
      totalMembers,
      certificationRate: Math.round((certifiedMembers / totalMembers) * 100) || 0,
      successStories: successPosts,
      engagement: totalInteractions
    };
  }, [members, posts]);

  const goalProgress = useMemo(() => {
    if (goals.length === 0) return 0;
    const completed = goals.filter(g => g.isCompleted).length;
    return Math.round((completed / goals.length) * 100);
  }, [goals]);

  // --- DATA FOR CHARTS ---

  const sectorData = useMemo(() => {
    const sectors: {[key: string]: number} = {};
    members.forEach(m => {
      sectors[m.sector] = (sectors[m.sector] || 0) + 1;
    });
    return Object.keys(sectors).map(key => ({ name: key, value: sectors[key] }));
  }, [members]);

  const activityData = useMemo(() => {
    const types: {[key: string]: number} = { 'Besoin': 0, 'Succès': 0, 'Partage': 0, 'Question': 0 };
    posts.forEach(p => {
      if (types[p.type] !== undefined) {
        types[p.type]++;
      }
    });
    return Object.keys(types).map(key => ({ name: key, count: types[key] }));
  }, [posts]);

  const COLORS = ['#ef4444', '#f87171', '#fca5a5', '#fee2e2', '#b91c1c'];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-card p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="w-16 h-16 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Membres Actifs</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalMembers}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 w-fit px-2 py-1 rounded-full">
            <ArrowUpRight className="w-3 h-3 mr-1" />
            +12% ce mois
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Award className="w-16 h-16 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taux Certification</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.certificationRate}%</h3>
          </div>
          <div className="mt-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.certificationRate}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Histoires de Succès</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.successStories}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            Inspirant la communauté
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageCircle className="w-16 h-16 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Interactions</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.engagement}</h3>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 w-fit px-2 py-1 rounded-full">
            <Zap className="w-3 h-3 mr-1" />
            Très Actif
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sector Distribution */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary-600" />
            Répartition par Secteur
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Le secteur Agroalimentaire domine actuellement le cluster.
          </div>
        </div>

        {/* Activity Analysis */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
                Dynamique du Cluster (Posts)
             </h3>
             <select className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-gray-50 dark:bg-gray-700 outline-none dark:text-white">
                <option>Ce mois</option>
                <option>3 derniers mois</option>
             </select>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="count" name="Nombre de posts" radius={[4, 4, 0, 0]}>
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                        entry.name === 'Besoin' ? '#fbbf24' :
                        entry.name === 'Succès' ? '#22c55e' :
                        entry.name === 'Question' ? '#a855f7' : '#3b82f6'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center italic">
            Analyse en temps réel des types d'échanges sur la plateforme.
          </p>
        </div>
      </div>

      {/* Bottom Section: Roadmap Only (Victories Removed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 hidden lg:block">
           {/* Placeholder for layout balance or future content */}
           <div className="h-full bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center p-6 text-gray-400 text-sm">
             Espace réservé pour futures analyses (Flux financier, etc.)
           </div>
        </div>

        {/* Roadmap / Goals */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-lg text-white lg:col-span-1 flex flex-col justify-between relative overflow-hidden">
           <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
           
           <div>
              <h3 className="text-lg font-bold mb-1 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary-400" />
                  Cap sur 2026
              </h3>
              <p className="text-gray-400 text-xs mb-6">Objectifs stratégiques du Cluster</p>

              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {goals.map((goal, idx) => (
                      <div key={goal.id} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${goal.isCompleted ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-gray-600'}`}></div>
                          <span className={`text-sm ${goal.isCompleted ? 'text-white font-medium' : 'text-gray-400'}`}>{goal.text}</span>
                      </div>
                  ))}
              </div>
           </div>

           <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-gray-400">Progression Globale</span>
                  <span className="text-xl font-bold text-primary-400">{goalProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary-500 h-full rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  ></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 text-right">Lancement officiel : {CLUSTER_INFO.startDate}</p>
           </div>
        </div>

      </div>
    </div>
  );
};