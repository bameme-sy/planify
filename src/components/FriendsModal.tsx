import React, { useState, useEffect, useCallback } from 'react';
import { User, Friendship } from '../types';
import { 
  getAllUsers, 
  saveUsers,
  getFriendships,
  saveFriendships,
  sendFriendRequest as localSendFriendRequest, 
  acceptFriendRequest as localAcceptFriendRequest, 
  declineFriendRequest as localDeclineFriendRequest,
  removeFriend as localRemoveFriend
} from '../utils/authStorage';
import { apiClient } from '../api/client';
import { 
  X, 
  Users, 
  UserPlus, 
  Check, 
  Search, 
  Calendar, 
  Clock, 
  UserX,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onViewFriendSchedule: (friend: User) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onViewFriendSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'all'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Initialisation avec le cache local pour affichage instantané
  const [users, setUsers] = useState<User[]>(() => getAllUsers());
  const [friendships, setFriendships] = useState<Friendship[]>(() => getFriendships());

  // Récupération des données depuis le serveur MySQL / PHP
  const fetchSocialData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      const isCloud = await apiClient.isAvailable();
      if (!isCloud) {
        setIsLoading(false);
        return;
      }

      const [usersRes, friendshipsRes] = await Promise.allSettled([
        apiClient.getAllUsers(),
        apiClient.getFriendships(currentUser.id)
      ]);

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
        saveUsers(usersRes.value);
      }

      if (friendshipsRes.status === 'fulfilled' && Array.isArray(friendshipsRes.value)) {
        setFriendships(friendshipsRes.value);
        saveFriendships(friendshipsRes.value);
      }
    } catch (err) {
      console.warn('Erreur chargement réseau social :', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Synchronisation à l'ouverture de la modale
  useEffect(() => {
    if (isOpen) {
      fetchSocialData();
    }
  }, [isOpen, fetchSocialData]);

  if (!isOpen) return null;

  // Listes dérivées de l'état actuel
  const allUsers = users.filter((u) => u.id !== currentUser.id);

  const acceptedFriendships = friendships.filter(
    (f) => f.status === 'accepted' && (f.senderId === currentUser.id || f.receiverId === currentUser.id)
  );
  const friendIds = acceptedFriendships.map((f) => (f.senderId === currentUser.id ? f.receiverId : f.senderId));
  const friends = users.filter((u) => friendIds.includes(u.id));

  const pendingReceived = friendships
    .filter((f) => f.receiverId === currentUser.id && f.status === 'pending')
    .map((request) => {
      const sender = users.find((u) => u.id === request.senderId) || {
        id: request.senderId,
        name: 'Utilisateur',
        username: 'inconnu',
        email: '',
        createdAt: 0,
      };
      return { request, sender };
    });

  const pendingSent = friendships
    .filter((f) => f.senderId === currentUser.id && f.status === 'pending')
    .map((request) => {
      const receiver = users.find((u) => u.id === request.receiverId) || {
        id: request.receiverId,
        name: 'Utilisateur',
        username: 'inconnu',
        email: '',
        createdAt: 0,
      };
      return { request, receiver };
    });

  const filteredAllUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const notifyChange = () => {
    window.dispatchEvent(new CustomEvent('planify_social_updated'));
  };

  // 1. Envoyer une demande d'ami
  const handleSendRequest = async (receiverId: string) => {
    setActionLoadingId(receiverId);
    try {
      try {
        await apiClient.sendFriendRequest(receiverId, currentUser.id);
      } catch (e) {
        console.warn('API sendFriendRequest fallback:', e);
      }
      try {
        localSendFriendRequest(currentUser.id, receiverId);
      } catch {}

      setActionFeedback('Demande envoyée !');
      setTimeout(() => setActionFeedback(null), 3000);
      await fetchSocialData();
      notifyChange();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionFeedback(err.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Accepter une demande d'ami
  const handleAcceptRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      try {
        await apiClient.updateFriendshipStatus(requestId, 'accepted');
      } catch (e) {
        console.warn('API updateFriendshipStatus fallback:', e);
      }
      try {
        localAcceptFriendRequest(requestId);
      } catch {}

      setActionFeedback('Demande acceptée !');
      setTimeout(() => setActionFeedback(null), 3000);
      await fetchSocialData();
      notifyChange();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionFeedback(err.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Refuser ou annuler une demande d'ami
  const handleDeclineRequest = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      try {
        await apiClient.deleteFriendship(requestId, currentUser.id);
      } catch {
        try {
          await apiClient.updateFriendshipStatus(requestId, 'declined');
        } catch (e) {
          console.warn('API decline fallback:', e);
        }
      }
      try {
        localDeclineFriendRequest(requestId);
      } catch {}

      await fetchSocialData();
      notifyChange();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionFeedback(err.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Retirer un ami
  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Retirer ce contact de votre réseau ?')) return;

    setActionLoadingId(friendId);
    try {
      try {
        await apiClient.removeFriend(friendId, currentUser.id);
      } catch (e) {
        console.warn('API removeFriend fallback:', e);
      }
      try {
        localRemoveFriend(currentUser.id, friendId);
      } catch {}

      await fetchSocialData();
      notifyChange();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionFeedback(err.message);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div 
        className="bg-white dark:bg-[#252528] rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#e5e5ea] dark:border-[#38383a] overflow-hidden animate-in fade-in zoom-in-98 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#e5e5ea] dark:border-[#38383a] flex items-center justify-between bg-[#f6f6f7] dark:bg-[#202022] shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#007aff]" />
            <div>
              <h3 className="font-semibold text-[14px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                Réseau & Partages
              </h3>
              <p className="text-[11px] text-[#8e8e93]">
                Connecté : @{currentUser.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchSocialData()}
              title="Rafraîchir"
              disabled={isLoading}
              className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Apple Segmented Tabs & Search */}
        <div className="px-5 pt-3 pb-2 border-b border-[#e5e5ea] dark:border-[#38383a] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="inline-flex p-[2px] rounded-[7px] bg-[#e3e3e8] dark:bg-[#3a3a3c] w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 sm:flex-none px-3 py-0.5 text-[12px] font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                  : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <span>Contacts ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 sm:flex-none px-3 py-0.5 text-[12px] font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                  : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <span>Demandes</span>
              {pendingReceived.length > 0 && (
                <span className="h-3.5 min-w-[14px] px-1 rounded-full bg-[#ff3b30] text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingReceived.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-3 py-0.5 text-[12px] font-medium rounded-[5px] transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-[#636366] text-[#1d1d1f] dark:text-white shadow-xs font-semibold'
                  : 'text-[#636366] dark:text-[#aeaeb2] hover:text-[#1d1d1f] dark:hover:text-white'
              }`}
            >
              <span>Tous ({allUsers.length})</span>
            </button>
          </div>

          {activeTab === 'all' && (
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#8e8e93]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-0.5 text-[12px] rounded-[6px] bg-[#e3e3e8]/70 dark:bg-[#3a3a3c]/70 hover:bg-[#e3e3e8] dark:hover:bg-[#3a3a3c] focus:bg-white dark:focus:bg-[#1e1e1e] border border-transparent focus:border-[#007aff]/50 outline-none text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#8e8e93]"
              />
            </div>
          )}
        </div>

        {/* Feedback banner */}
        {actionFeedback && (
          <div className="px-5 py-1.5 bg-[#007aff]/10 dark:bg-[#0a84ff]/20 text-[#007aff] dark:text-[#70baff] text-[11px] font-medium shrink-0">
            {actionFeedback}
          </div>
        )}

        {/* Tab Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2">
          
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="h-10 w-10 rounded-full bg-[#f2f2f7] dark:bg-[#323234] text-[#8e8e93] flex items-center justify-center mx-auto">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                      Aucun contact partagé
                    </h4>
                    <p className="text-[11px] text-[#8e8e93] max-w-xs mx-auto mt-0.5">
                      Découvrez les membres dans l'onglet « Tous » pour envoyer des demandes et consulter leurs plannings.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-3 py-1 bg-[#007aff] text-white rounded-[6px] text-[12px] font-medium hover:bg-[#0069d9] transition-colors"
                  >
                    Découvrir les membres
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-2.5 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] bg-white dark:bg-[#202022] flex items-center justify-between gap-2.5 hover:border-[#007aff] transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#007aff] text-white flex items-center justify-center font-semibold text-[12px] shrink-0">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-medium text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {friend.name}
                          </h4>
                          <span className="text-[11px] text-[#8e8e93]">
                            @{friend.username}
                          </span>
                        </div>
                        {friend.bio && (
                          <p className="text-[11px] text-[#8e8e93] line-clamp-1">
                            {friend.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          onViewFriendSchedule(friend);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] text-white text-[11px] font-medium transition-colors"
                      >
                        <Calendar className="h-3 w-3" />
                        <span>Voir planning</span>
                      </button>

                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={actionLoadingId === friend.id}
                        title="Retirer de mes contacts"
                        className="p-1.5 rounded-[4px] text-[#8e8e93] hover:text-[#ff3b30] hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        {actionLoadingId === friend.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserX className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* TAB 2: PENDING REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {/* Received */}
              <div>
                <h4 className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-1.5">
                  Demandes reçues ({pendingReceived.length})
                </h4>

                {pendingReceived.length === 0 ? (
                  <p className="text-[11px] text-[#8e8e93] italic py-1">
                    Aucune demande reçue en attente.
                  </p>
                ) : (
                  pendingReceived.map(({ request, sender }) => (
                    <div
                      key={request.id}
                      className="p-2.5 rounded-[8px] border border-[#e5e5ea] dark:border-[#38383a] bg-white dark:bg-[#202022] flex items-center justify-between gap-2.5 mb-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-[#007aff] text-white flex items-center justify-center font-semibold text-[11px] shrink-0">
                          {sender.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {sender.name} <span className="text-[#8e8e93] font-normal">(@{sender.username})</span>
                          </div>
                          <div className="text-[10px] text-[#8e8e93]">
                            Souhaite partager ses plannings avec vous
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={actionLoadingId === request.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#34c759] hover:bg-[#2db84e] text-white rounded-[6px] text-[11px] font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoadingId === request.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>Accepter</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={actionLoadingId === request.id}
                          className="px-2 py-1 text-[11px] text-[#8e8e93] hover:text-[#ff3b30] rounded-[6px] transition-colors disabled:opacity-50"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sent */}
              <div>
                <h4 className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-1.5">
                  Demandes envoyées ({pendingSent.length})
                </h4>

                {pendingSent.length === 0 ? (
                  <p className="text-[11px] text-[#8e8e93] italic py-0.5">
                    Aucune demande en cours d'attente.
                  </p>
                ) : (
                  pendingSent.map(({ request, receiver }) => (
                    <div
                      key={request.id}
                      className="p-2 rounded-[6px] border border-[#e5e5ea] dark:border-[#38383a] bg-white/50 dark:bg-[#202022]/50 flex items-center justify-between gap-2 mb-1 text-[12px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#8e8e93]" />
                        <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {receiver.name} (@{receiver.username})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8e8e93] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          En attente
                        </span>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={actionLoadingId === request.id}
                          className="text-[10px] text-[#8e8e93] hover:text-[#ff3b30] underline disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ALL USERS DIRECTORY */}
          {activeTab === 'all' && (
            <div className="space-y-1.5">
              {filteredAllUsers.length === 0 ? (
                <p className="text-[12px] text-[#8e8e93] text-center py-4">
                  {isLoading ? 'Chargement des membres...' : 'Aucun membre trouvé.'}
                </p>
              ) : (
                filteredAllUsers.map((user) => {
                  const isAlreadyFriend = friends.some((f) => f.id === user.id);
                  const isPendingSent = pendingSent.some((p) => p.receiver.id === user.id);
                  const isPendingReceived = pendingReceived.some((p) => p.sender.id === user.id);

                  return (
                    <div
                      key={user.id}
                      className="p-2 rounded-[6px] border border-[#e5e5ea] dark:border-[#38383a] bg-white dark:bg-[#202022] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-[#d1d1d6] dark:bg-[#48484a] text-[#1d1d1f] dark:text-white flex items-center justify-center font-medium text-[11px] shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-medium text-[12px] text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                            {user.name}
                          </div>
                          <div className="text-[10px] text-[#8e8e93]">
                            @{user.username}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAlreadyFriend ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#34c759] font-medium flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Contact
                            </span>
                            <button
                              onClick={() => {
                                onViewFriendSchedule(user);
                                onClose();
                              }}
                              className="px-2 py-0.5 rounded-[5px] bg-[#007aff] hover:bg-[#0069d9] text-white text-[11px] font-medium transition-colors"
                            >
                              Planning
                            </button>
                          </div>
                        ) : isPendingSent ? (
                          <span className="text-[11px] text-[#8e8e93] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Envoyé
                          </span>
                        ) : isPendingReceived ? (
                          <span className="text-[11px] text-[#007aff] font-medium">
                            En attente de votre réponse
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(user.id)}
                            disabled={actionLoadingId === user.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] text-white text-[11px] font-medium transition-colors disabled:opacity-50"
                          >
                            {actionLoadingId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <UserPlus className="h-3 w-3" />
                            )}
                            <span>Inviter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
