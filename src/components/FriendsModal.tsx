import React, { useState } from 'react';
import { User } from '../types';
import { 
  getAllUsers, 
  getFriendsForUser, 
  getPendingRequestsReceived, 
  getPendingRequestsSent,
  sendFriendRequest, 
  acceptFriendRequest, 
  declineFriendRequest,
  removeFriend
} from '../utils/authStorage';
import { 
  X, 
  Users, 
  UserPlus, 
  Check, 
  Search, 
  Calendar, 
  Clock, 
  UserX 
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

  // Force re-render on state change
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  if (!isOpen) return null;

  const friends = getFriendsForUser(currentUser.id);
  const pendingReceived = getPendingRequestsReceived(currentUser.id);
  const pendingSent = getPendingRequestsSent(currentUser.id);
  const allUsers = getAllUsers().filter((u) => u.id !== currentUser.id);

  const filteredAllUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleSendRequest = (receiverId: string) => {
    try {
      sendFriendRequest(currentUser.id, receiverId);
      setActionFeedback('Demande envoyée !');
      setTimeout(() => setActionFeedback(null), 3000);
      refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionFeedback(err.message);
      }
    }
  };

  const handleAcceptRequest = (requestId: string) => {
    acceptFriendRequest(requestId);
    setActionFeedback('Demande acceptée !');
    setTimeout(() => setActionFeedback(null), 3000);
    refresh();
  };

  const handleDeclineRequest = (requestId: string) => {
    declineFriendRequest(requestId);
    refresh();
  };

  const handleRemoveFriend = (friendId: string) => {
    if (confirm('Retirer ce contact de votre réseau ?')) {
      removeFriend(currentUser.id, friendId);
      refresh();
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

          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
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
                        title="Retirer de mes contacts"
                        className="p-1.5 rounded-[4px] text-[#8e8e93] hover:text-[#ff3b30] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <UserX className="h-3.5 w-3.5" />
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
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#34c759] hover:bg-[#2db84e] text-white rounded-[6px] text-[11px] font-medium transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          <span>Accepter</span>
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          className="px-2 py-1 text-[11px] text-[#8e8e93] hover:text-[#ff3b30] rounded-[6px] transition-colors"
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
                          className="text-[10px] text-[#8e8e93] hover:text-[#ff3b30] underline"
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
                  Aucun membre trouvé.
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
                            className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#007aff] hover:bg-[#0069d9] text-white text-[11px] font-medium transition-colors"
                          >
                            <UserPlus className="h-3 w-3" />
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
