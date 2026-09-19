/* Shared by the browser and dependency-free Node tests. */
(function (root) {
    "use strict";
    const KEY = "friend-manager.v1";
    const relationships = ["학교친구", "동아리친구", "고향친구", "교회친구", "기타"];
    const fields = ["name", "relationship", "phone", "email", "address", "birthday", "memo"];
    const seed = [
        ["김민수", "학교친구", "010-1234-5678", "minsu@example.com", "2004-03-15"],
        ["이서연", "동아리친구", "010-2345-6789", "seoyeon@example.com", "2004-07-21"],
        ["박지훈", "고향친구", "010-3456-7890", "jihoon@example.com", "2003-12-02"],
        ["최유진", "학교친구", "010-4567-8901", "yujin@example.com", "2004-05-11"],
        ["정현우", "교회친구", "010-5678-9012", "hyunwoo@example.com", "2003-09-25"]
    ].map(([name, relationship, phone, email, birthday], i) => ({
        id: "sample-" + (i + 1), name, relationship, phone, email, birthday,
        address: "경상북도 포항시", memo: "과제 시연용 예시 데이터"
    }));

    function today() {
        const d = new Date();
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    }

    function validate(value) {
        const errors = {};
        if (value.name.length < 2 || value.name.length > 50) errors.name = "이름은 2~50자로 입력하세요.";
        if (!relationships.includes(value.relationship)) errors.relationship = "관계를 선택하세요.";
        if (!/^010-\d{4}-\d{4}$/.test(value.phone)) errors.phone = "전화번호는 010-1234-5678 형식으로 입력하세요.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email) || value.email.length > 254) errors.email = "올바른 이메일 주소를 입력하세요.";
        if (!value.address || value.address.length > 200) errors.address = "주소를 1~200자로 입력하세요.";
        const date = new Date(value.birthday + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthday) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.birthday || value.birthday < "1900-01-01" || value.birthday > today()) errors.birthday = "생일은 1900년 1월 1일부터 오늘 사이의 실제 날짜를 입력하세요.";
        if (value.memo.length > 100) errors.memo = "메모는 100자 이하로 입력하세요.";
        return errors;
    }

    function createStore(storage, makeId) {
        function write(list) {
            try { storage.setItem(KEY, JSON.stringify(list)); }
            catch { throw new Error("저장하지 못했습니다. 브라우저 저장 공간과 사이트 저장 권한을 확인하세요."); }
        }
        function list() {
            let raw;
            try { raw = storage.getItem(KEY); }
            catch { throw new Error("브라우저 저장소에 접근할 수 없습니다. 사이트 저장 권한을 확인하세요."); }
            if (raw === null) { write(seed); return seed.map(item => ({ ...item })); }
            let data;
            try { data = JSON.parse(raw); }
            catch { throw new Error("저장 데이터가 손상되었습니다. 기존 데이터는 덮어쓰지 않았습니다. README의 복구 안내를 확인하세요."); }
            if (!Array.isArray(data) || data.some(item => !item || typeof item.id !== "string" || !item.id || fields.some(field => typeof item[field] !== "string")) || new Set(data.map(item => item.id)).size !== data.length) {
                throw new Error("저장 데이터 형식이 올바르지 않습니다. README의 복구 안내를 확인하세요.");
            }
            return data;
        }
        function get(id) { return list().find(item => item.id === id); }
        function save(input, id) {
            const value = Object.fromEntries(fields.map(field => [field, String(input[field] ?? "").trim()]));
            const errors = validate(value);
            if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
            const data = list();
            if (id !== undefined) {
                const index = data.findIndex(item => item.id === id);
                if (index === -1) throw new Error("친구를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.");
                data[index] = { ...value, id };
            } else {
                id = makeId();
                if (data.some(item => item.id === id)) throw new Error("식별자 생성에 실패했습니다. 다시 시도하세요.");
                data.push({ ...value, id });
            }
            write(data);
            return id;
        }
        function remove(id) {
            const data = list();
            if (!data.some(item => item.id === id)) throw new Error("친구를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.");
            write(data.filter(item => item.id !== id));
        }
        return { list, get, save, remove };
    }
    const api = { KEY, fields, today, validate, createStore };
    if (typeof module !== "undefined" && module.exports) module.exports = api;
    else root.FriendData = api;
})(globalThis);
