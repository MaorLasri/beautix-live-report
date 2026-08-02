(() => {
  const add = () => {
    document.querySelectorAll('.sidebar-nav').forEach(nav => {
      if (nav.querySelector('a[href="data-import.html"]')) return;
      const a=document.createElement('a');
      a.href='data-import.html'; a.innerHTML='<span>הזנת / העלאת נתונים</span>';
      if (location.pathname.endsWith('/data-import.html')) a.classList.add('active');
      nav.appendChild(a);
    });
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',add):add();
})();