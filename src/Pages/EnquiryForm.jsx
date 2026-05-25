import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import Dashboard from "../Components/Dashboard";
import FollowUpNotes from "../Components/FollowUpNotes";
import {
  Search,
  CheckCircle2,
  Edit2,
  Eye,
  MessageCircle,
  Phone,
  UserPlus,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  XCircle,
  StickyNote,
} from "lucide-react";
import "./CSS/EnquiryForm.css";

export default function EnquiryForm() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [takingId, setTakingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("all");

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const limit = 9;
  const socket = io(import.meta.env.VITE_API_URL);
  const employeeId = localStorage.getItem("employeeId");
  const API_URL = import.meta.env.VITE_API_URL;

  const fetchAvailableEnquiries = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_URL}/digicoder/crm/api/v1/lead/available-public-leads/${employeeId}`,
        { params: { search: search || undefined, page, limit } }
      );


      if (res.data.success) {
        return {
          data: res.data.leads.map((lead) => ({ ...lead, isAssignedToMe: false })),
          total: res.data.total || 0,
          totalPages: res.data.totalPages || 1,
        };
      }
      return { data: [], total: 0, totalPages: 1 };
    } catch {
      return { data: [], total: 0, totalPages: 1 };
    }
  }, [search, page, API_URL, employeeId]);

  const fetchMyEnquiries = useCallback(async () => {
    if (!employeeId) return { data: [], total: 0, totalPages: 1 };
    try {
      const res = await axios.get(
        `${API_URL}/digicoder/crm/api/v1/lead/accepted-public-leads/${employeeId}`,
        { params: { search: search || undefined, page, limit } }
      );
      if (res.data.success) {
        return {
          data: res.data.leads.map((lead) => ({ ...lead, isAssignedToMe: true })),
          total: res.data.count || 0,
          totalPages: res.data.totalPages || 1,
        };
      }
      return { data: [], total: 0, totalPages: 1 };
    } catch {
      return { data: [], total: 0, totalPages: 1 };
    }
  }, [search, page, employeeId, API_URL]);

  const fetchAllEnquiries = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      let combinedLeads = [], totalCount = 0, maxPages = 1;

      if (activeTab === "all") {
        const [availableResult, myResult] = await Promise.all([
          fetchAvailableEnquiries(),
          fetchMyEnquiries(),
        ]);
        const leadsMap = new Map();
        availableResult.data.forEach((lead) => leadsMap.set(lead._id, lead));
        myResult.data.forEach((lead) => leadsMap.set(lead._id, lead));
        combinedLeads = Array.from(leadsMap.values());
        totalCount = availableResult.total + myResult.total;
        maxPages = Math.max(availableResult.totalPages, myResult.totalPages);
      } else if (activeTab === "available") {
        const result = await fetchAvailableEnquiries();
        combinedLeads = result.data;
        totalCount = result.total;
        maxPages = result.totalPages;
      } else if (activeTab === "assigned") {
        const result = await fetchMyEnquiries();
        combinedLeads = result.data;
        totalCount = result.total;
        maxPages = result.totalPages;
      }

      combinedLeads.sort((a, b) => {
        if (a.isAssignedToMe === b.isAssignedToMe) return 0;
        return a.isAssignedToMe ? 1 : -1;
      });

      setLeads(combinedLeads);
      setTotal(totalCount);
      setTotalPages(maxPages);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchAvailableEnquiries, fetchMyEnquiries, employeeId]);

  const takeLead = async (leadId) => {
    try {
      if (!employeeId) return alert("Employee ID not found");
      setTakingId(leadId);
      const res = await axios.put(
        `${API_URL}/digicoder/crm/api/v1/lead/accept-public-lead`,
        { leadId, employeeId }
      );
      if (res.data.success) {
        await fetchAllEnquiries();
        alert("Lead assigned successfully!");
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Something went wrong");
    } finally {
      setTakingId(null);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleAddNote = (lead) => {
    setSelectedLead(lead);
    setIsNoteModalOpen(true);
  };

  const handleCloseNoteModal = (shouldRefresh = false) => {
    setIsNoteModalOpen(false);
    setSelectedLead(null);
    if (shouldRefresh) fetchAllEnquiries();
  };

  const handleWhatsApp = (lead) => {
    if (lead.phone) {
      window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`, "_blank");
    } else alert("Phone number not available");
  };

  const handleCall = (lead) => {
    if (lead.phone) window.location.href = `tel:${lead.phone}`;
    else alert("Phone number not available");
  };

  const handleEdit = (lead) => alert(`Edit lead: ${lead.name}`);
  const handleView = (lead) => alert(`View lead: ${lead.name}`);

  const getStatusConfig = (lead) => {
    if (lead.closed) return { bg: "#dcfce7", color: "#15803d", Icon: CheckCircle2, label: "Closed", cls: "enquiry-badge-closed" };
    if (lead.negative) return { bg: "#fee2e2", color: "#b91c1c", Icon: XCircle, label: "Negative", cls: "enquiry-badge-negative" };
    return { bg: "#fef9c3", color: "#a16207", Icon: Clock, label: "Active", cls: "enquiry-badge-active" };
  };

  useEffect(() => { fetchAllEnquiries(); }, [fetchAllEnquiries]);

  useEffect(() => {
    socket.on("leadAccepted", ({ leadId }) => {
      setLeads((prev) => prev.filter((lead) => lead._id !== leadId));
    });
    return () => socket.off("leadAccepted");
  }, [socket]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSearchInput("");
  };

  return (
    <Dashboard>
      <div className="enquiry-page">

        {/* ── Header ── */}
        <div className="enquiry-header">
          <div className="enquiry-header-left">
            <div className="enquiry-icon-box">
              <Users size={22} color="#fff" />
            </div>
            <div>
              <h1 className="enquiry-title">All Enquiries</h1>
              <p className="enquiry-subtitle">
                {activeTab === "all" && `${total} total enquiries`}
                {activeTab === "available" && `${total} available enquiries`}
                {activeTab === "assigned" && `${total} assigned to you`}
              </p>
            </div>
          </div>
          <button className="enquiry-refresh-btn" onClick={fetchAllEnquiries} title="Refresh">
            <RefreshCw size={16} color="#555" />
          </button>
        </div>

        {/* ── Search ── */}
        <form className="enquiry-search-row" onSubmit={handleSearch}>
          <div className="enquiry-search-box">
            <Search size={16} className="enquiry-search-icon" />
            <input
              className="enquiry-search-input"
              placeholder="Search by name, phone, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="enquiry-search-btn">Search</button>
        </form>

        {/* ── Tabs ── */}
        <div className="enquiry-tabs">
          {["all", "available", "assigned"].map((tab) => (
            <button
              key={tab}
              className={`enquiry-tab${activeTab === tab ? " enquiry-tab-active" : ""}`}
              onClick={() => switchTab(tab)}
            >
              {tab === "all" ? "All" : tab === "available" ? "New" : "My Enquiries"}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="enquiry-center">
            <Loader2 size={32} color="#6366f1" className="enquiry-spinner" />
            <p className="enquiry-loading-text">Loading enquiries...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="enquiry-empty">
            <Users size={48} color="#d1d5db" />
            <p className="enquiry-empty-text">
              {activeTab === "available" && "No available enquiries found"}
              {activeTab === "assigned" && "No enquiries assigned to you"}
              {activeTab === "all" && "No enquiries found"}
            </p>
          </div>
        ) : (
          <div className="enquiry-grid">
            {leads.map((lead, idx) => (
              <LeadCard
                key={lead._id}
                lead={lead}
                idx={idx}
                takingId={takingId}
                onTake={takeLead}
                onEdit={handleEdit}
                onView={handleView}
                onAddNote={handleAddNote}
                onWhatsApp={handleWhatsApp}
                onCall={handleCall}
                isAssigned={lead.isAssignedToMe === true}
                isUnassigned={!lead.leadAssignedTo || lead.leadAssignedTo.length === 0}
                statusCfg={getStatusConfig(lead)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="enquiry-pagination">
            <button
              className={`enquiry-page-btn${page === 1 ? " enquiry-disabled" : ""}`}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`enquiry-page-btn${p === page ? " enquiry-page-active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            {totalPages > 5 && <span className="enquiry-page-dots">...</span>}
            {totalPages > 5 && (
              <button
                className={`enquiry-page-btn${totalPages === page ? " enquiry-page-active" : ""}`}
                onClick={() => setPage(totalPages)}
              >
                {totalPages}
              </button>
            )}

            <button
              className={`enquiry-page-btn${page === totalPages ? " enquiry-disabled" : ""}`}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── FollowUpNotes Modal ── */}
      <FollowUpNotes
        isOpenNote={isNoteModalOpen}
        oncloseNote={handleCloseNoteModal}
        leadData={selectedLead}
        onFollowupAdded={fetchAllEnquiries}
      />
    </Dashboard>
  );
}

/* ══════════════════════════════════════════════
   LeadCard Component - Layout: 2 left (Edit, View) + 3 right (Note, WhatsApp, Call)
══════════════════════════════════════════════ */
function LeadCard({
  lead, idx, takingId, onTake, onEdit, onView,
  onAddNote, onWhatsApp, onCall,
  isAssigned, isUnassigned, statusCfg,
}) {
  const isTaking = takingId === lead._id;

  return (
    <div className="Dynamic-card">

      <strong style={{ float: 'right' }}>#{(idx || 0) + 1}</strong>

      <div className="dynamic-card-details-body">
        <div className="dynamic-card-details">
          <div className="card-body">
            <p>
              <span className='card-heading'>Name:- </span>
              <span>{lead.name}</span>
            </p>
            <p>
              <span className='card-heading'>Mobile:- </span>
              <span>{lead.phone}</span>
            </p>

            <div className="priority-source">
              <p>
                <span className='card-heading'>Service:- </span>
                <span>{lead.services?.servicesText || "NA"}</span>
              </p>
              <p>
                <span className='card-heading'>Status:- </span>
                <span>{lead.leadStatus?.leadStatusText || "NA"}</span>
              </p>
            </div>
            <p>
              <span>
                Created At:-{" "}
                {new Date(lead.createdAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "numeric",
                  minute: "numeric",
                  second: "numeric",
                  hour12: true,
                })}
              </span>
            </p>
            <div className="tags">
              {lead.tags && Array.isArray(lead.tags) && lead.tags.map((tag, tagIndex) => (
                <span key={tagIndex} className="tag">
                  {typeof tag === 'string' ? tag : tag.tagName}
                </span>
              ))}
            </div>
            <br />
          </div>
        </div>
      </div>

      <div className="dynamic-card-footer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>

          {/* LEFT SIDE - 2 buttons (Edit, View) - Only visible when assigned */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

            <>
              <div className="call-icon-wrapper">
                <button
                  onClick={() => onEdit(lead)}
                  style={{
                    color: '#3454D1',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <i className="ri-edit-box-fill"></i>
                </button>
              </div>
              <div className="call-icon-wrapper">
                <button
                  onClick={() => onView(lead)}
                  style={{
                    color: 'red',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <i className="ri-eye-line"></i>
                </button>
              </div>
            </>

          </div>

          {/* RIGHT SIDE - 3 buttons (Note, WhatsApp, Call) OR Take button if not assigned */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!isAssigned ? (
              <button
                onClick={() => onTake(lead._id)}
                disabled={isTaking}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isTaking ? 'not-allowed' : 'pointer',
                  opacity: isTaking ? 0.6 : 1,
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {isTaking ? (
                  <Loader2 size={14} className="enquiry-spinner" />
                ) : (
                  <UserPlus size={14} />
                )}
                <span>Take Lead</span>
              </button>
            ) : (
              <>
                <div className="call-icon-wrapper">
                  <button
                    onClick={() => onAddNote(lead)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
                  >
                    <StickyNote size={18} color="#657C7B" />
                  </button>
                </div>
                <div className="call-icon-wrapper">
                  <button
                    onClick={() => onWhatsApp(lead)}
                    style={{
                      color: 'green',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <i className="ri-whatsapp-line"></i>
                  </button>
                </div>
                <div className="call-icon-wrapper">
                  <button
                    onClick={() => onCall(lead)}
                    style={{
                      color: '#3454D1',
                      backgroundColor: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <i className="ri-phone-fill"></i>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}