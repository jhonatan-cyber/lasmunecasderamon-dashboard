$root = "d:\DEVELOPMEND\lasmunecasderamon.com\lasmunecasderamon"
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object { 
    ($_.Extension -eq '.tsx' -or $_.Extension -eq '.ts') -and 
    $_.FullName -notmatch 'node_modules|\.next' 
}
Write-Host "Found $($files.Count) files to scan"

$replacements = @(
    @('@/components/ui/IndividualHostessSelect', '@/components/shared/selects/IndividualHostessSelect'),
    @('@/components/ui/PaymentMethodSelect', '@/components/shared/selects/PaymentMethodSelect'),
    @('@/components/ui/CustomersSelect', '@/components/shared/selects/CustomersSelect'),
    @('@/components/ui/CustomerSelect', '@/components/shared/selects/CustomerSelect'),
    @('@/components/ui/HostessSelect', '@/components/shared/selects/HostessSelect'),
    @('@/components/ui/RoomSelect', '@/components/shared/selects/RoomSelect'),
    @('@/components/ui/UserSelect', '@/components/shared/selects/UserSelect'),
    @('@/components/ui/ActionButtonWithTooltip', '@/components/roles/ActionButtonWithTooltip'),
    @('@/components/ui/Pagination', '@/components/gratificaciones/Pagination'),
    @('@/components/ui/ProductSearch', '@/components/cuentas/ProductSearch'),
    @('@/components/ui/RoleSelect', '@/components/users/RoleSelect'),
    @('@/components/ui/productModal', '@/components/products/ProductModal'),
    @('@/components/ui/stats-card', '@/components/roles/RoleStatsCard'),
    @('@/components/ui/CategoryCardList', '@/components/shared/CategoryCardList'),
    @('@/components/ui/select-elements', '@/components/shared/SelectElements'),
    @('@/components/ui/ThemeSwitcher', '@/components/shared/ThemeSwitcher'),
    @('@/components/ui/ConfirmModal', '@/components/shared/ConfirmModal'),
    @('@/components/ui/SearchInput', '@/components/shared/SearchInput'),
    @('@/components/ui/background-gradient', '@/components/shared/background-gradient'),
    @('@/components/ui/StatsCard', '@/components/shared/StatsCard'),
    @('@/components/ui/skeletons', '@/components/shared/Skeletons'),
    @('@/components/ui/paginate', '@/components/shared/Paginate'),
    @('@/components/ui/3d-card', '@/components/shared/3d-card')
)

$count = 0
foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content

        foreach ($r in $replacements) {
            $content = $content.Replace($r[0], $r[1])
        }

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            $count++
            Write-Host "Updated: $($file.FullName.Replace($root, '').TrimStart('\'))"
        }
    } catch {
        Write-Host "ERROR: $($file.Name) - $_"
    }
}
Write-Host ""
Write-Host "============================="
Write-Host "Total files updated: $count"
Write-Host "============================="
