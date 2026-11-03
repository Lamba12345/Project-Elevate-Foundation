// Blog category filter
const filterBtns = document.querySelectorAll('.filter-btn');
const posts = document.querySelectorAll('.blog-post-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    posts.forEach(post => {
      if (filter === 'all' || post.dataset.category === filter) {
        post.classList.remove('hidden');
      } else {
        post.classList.add('hidden');
      }
    });
  });
});
