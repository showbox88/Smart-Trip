export const getStyleBlock = () => `
    <style>
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .li-item-hover:hover .delete-btn-hover { opacity: 1 !important; }
        .timeline-item-wrapper:hover .item-hover-action { opacity: 1 !important; pointer-events: all !important; }
        /* Marker pulse effect etc could go here */
    </style>
`;

export const getLoaderHTML = (message = "加载中...") => `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary);">
        <div class="loader"></div>
        <p style="margin-top:1rem;">${message}</p>
    </div>
`;
