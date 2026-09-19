"use strict";

(() => {
    const page = document.body.dataset.page;
    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const detailUrl = id => "view.html?id=" + encodeURIComponent(id);
    const showError = error => {
        $("message").textContent = error.message;
        $("message").hidden = false;
    };
    const guarded = fn => { try { fn(); } catch (error) { showError(error); } };

    if (page === "example") {
        $("example-fields").disabled = false;
        $("example-form").addEventListener("submit", event => {
            event.preventDefault();
            $("example-result").textContent = "입력 형식을 확인했습니다. 실제 로그인은 수행하지 않습니다.";
            $("example-form").reset();
        });
        return;
    }

    guarded(() => {
        const store = FriendData.createStore(localStorage, () => crypto.randomUUID());
        const success = { added: "친구를 추가했습니다.", updated: "친구 정보를 수정했습니다.", deleted: "친구를 삭제했습니다." };
        if ($("result-message")) $("result-message").textContent = success[params.get("result")] || "";

        if (page === "index") {
            const friends = store.list();
            $("list-caption").textContent = "전체 " + friends.length + "명 · 이름을 선택하면 상세 정보를 볼 수 있습니다.";
            $("empty-state").hidden = friends.length !== 0;
            friends.forEach((friend, index) => {
                const tr = document.createElement("tr");
                [index + 1, friend.name, friend.relationship, friend.phone, friend.email, friend.birthday].forEach((value, column) => {
                    const td = document.createElement("td");
                    if (column === 1) {
                        const a = document.createElement("a");
                        a.href = detailUrl(friend.id);
                        a.textContent = value;
                        td.append(a);
                    } else td.textContent = value;
                    tr.append(td);
                });
                $("friend-list").append(tr);
            });
            return;
        }

        let friend;
        if (page === "view" || page === "edit") {
            friend = id && store.get(id);
            if (!friend) throw new Error("친구를 찾을 수 없습니다. 친구 목록에서 다시 선택하세요.");
        }
        if (page === "view") {
            FriendData.fields.forEach(field => { $("detail-" + field).textContent = friend[field] || "—"; });
            $("edit-link").href = "edit.html?id=" + encodeURIComponent(id);
            $("friend-detail").hidden = false;
            $("delete-button").addEventListener("click", () => {
                if (!confirm(friend.name + "님의 정보를 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) return;
                guarded(() => {
                    store.remove(id);
                    location.href = "index.html?result=deleted";
                });
            });
            return;
        }

        if (page === "add" || page === "edit") {
            store.list();
            const form = $("friend-form");
            $("birthday").max = FriendData.today();
            if (friend) {
                FriendData.fields.forEach(field => { $(field).value = friend[field]; });
                $("cancel-link").href = detailUrl(id);
            }
            $("form-fields").disabled = false;
            form.addEventListener("input", event => event.target.setCustomValidity?.(""));
            form.addEventListener("change", event => event.target.setCustomValidity?.(""));
            form.addEventListener("submit", event => {
                event.preventDefault();
                $("message").hidden = true;
                const value = Object.fromEntries(FriendData.fields.map(field => [field, $(field).value.trim()]));
                const errors = FriendData.validate(value);
                FriendData.fields.forEach(field => $(field).setCustomValidity(errors[field] || ""));
                if (!form.reportValidity()) return;
                if (friend && !confirm("친구 정보를 수정할까요?")) return;
                guarded(() => {
                    const savedId = store.save(value, friend ? id : undefined);
                    location.href = friend ? detailUrl(savedId) + "&result=updated" : "index.html?result=added";
                });
            });
        }
    });
})();
