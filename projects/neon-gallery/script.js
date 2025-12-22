// ==== FILTERING IMAGES ====
const buttons = document.querySelectorAll(".btn");
const items = document.querySelectorAll(".gallery .item");

buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
        buttons.forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        let filter = btn.getAttribute("data-filter");

        items.forEach(item=>{
            item.style.display = (filter=="all" || item.classList.contains(filter))
                ? "block" : "none";
        });
    });
});


// ==== SEARCH BAR FILTER ====
document.getElementById("search").addEventListener("keyup", function(){
    let query = this.value.toLowerCase();
    items.forEach(item=>{
        let tags = item.getAttribute("data-tags").toLowerCase();
        item.style.display = tags.includes(query) ? "block" : "none";
    });
});


const galleryItems = document.querySelectorAll(".gallery .item img");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const closeBtn = document.getElementById("closeBtn");

let currentIndex = 0;

// Open Lightbox
function showImage(index) {
    currentIndex = index;
    lightboxImage.src = galleryItems[currentIndex].src;
    lightbox.style.display = "flex";
}

galleryItems.forEach((item, index) => {
    item.addEventListener("click", () => showImage(index));
});

// Prev Button
prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex === 0) ? galleryItems.length - 1 : currentIndex - 1;
    showImage(currentIndex);
});

// Next Button
nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex === galleryItems.length - 1) ? 0 : currentIndex + 1;
    showImage(currentIndex);
});

// Close Lightbox
closeBtn.addEventListener("click", () => {
    lightbox.style.display = "none";
});
